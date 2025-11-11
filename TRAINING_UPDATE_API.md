# Training Event Update API Documentation

## Endpoint
`PUT /api/training/:id`

## Overview
Comprehensive update endpoint for training events that handles:
- Training event details (course, schedule, venue, etc.)
- Costing details (cost breakdown items)
- Participant list (attendee ramco IDs)
- Attendance upload (PDF file)

## Request Format

### Content-Type
`multipart/form-data` (when including file upload)

### Path Parameters
- `id` (number, required): Training event ID

### Form Payload

```json
{
  "course_title": "Advanced Data Science Workshop",
  "course_id": 234,
  "series": "102",
  "session": "morning",           // morning | afternoon | fullday
  "sdate": "2024-06-01 09:00:00",
  "edate": "2024-06-05 17:00:00",
  "hrs": 40,
  "days": 5,
  "venue": "Tech Conference Center",
  "training_count": 25,           // number of selected participants
  "seat": 30,                     // allocated seats
  "event_cost": "5000.00",        // estimated total cost
  "costing_details": [
    {
      "ec_desc": "Venue Rental",
      "ec_amount": "2000.00"
    },
    {
      "ec_desc": "Trainer Fees",
      "amount": "2500.00"          // supports both 'ec_amount' and 'amount'
    },
    {
      "ec_desc": "Materials and Supplies",
      "ec_amount": "500.00"
    }
  ],
  "participants": [
    {
      "participant": "012345"      // ramco ID
    },
    {
      "participant": "678901"
    }
  ]
}
```

### File Upload
- **Field name**: `attendance_uploaded`
- **Type**: PDF
- **Storage path**: `process.env.UPLOAD_BASE_PATH/training/{training_id}-{original_filename}`
- **Database field**: `attendance_upload` (stores relative path)

## Validation Rules

### Required Fields (If Provided)
- `session`: Must be one of: `morning`, `afternoon`, `fullday`
- `training_count` vs `participants`: If both provided and participants array is not empty, they must match

### Field Mapping
- Costing supports both `ec_amount` and `amount` field names (fallback support)
- All flat fields are optional; only provided fields are updated

## Processing Flow

1. **Validate ID**: Ensure training_id is positive integer
2. **Validate session**: If provided, check against allowed values
3. **Validate participant count**: Match training_count with participants array length
4. **Extract flat fields**: Collect only training event table fields
5. **Process file**: Sanitize filename and generate DB path
6. **Update training event**: Execute update on training_events table
7. **Update costings**: Delete all existing, insert new (if provided)
8. **Update participants**: Delete all existing, insert new (if provided)

## Response Format

### Success (200 OK)
```json
{
  "status": "success",
  "message": "Training updated successfully",
  "data": {
    "training_id": 123,
    "event_updated": true,
    "costing_deleted": 3,
    "costing_inserted": 3,
    "participant_deleted": 2,
    "participant_inserted": 2,
    "file_uploaded": true
  }
}
```

### Validation Errors (400 Bad Request)
```json
{
  "status": "error",
  "message": "Invalid session. Must be one of: morning, afternoon, fullday",
  "data": null
}
```

```json
{
  "status": "error",
  "message": "training_count (25) does not match participants array length (20)",
  "data": null
}
```

```json
{
  "status": "error",
  "message": "File processing failed: Invalid filename",
  "data": null
}
```

### Server Errors (500 Internal Server Error)
```json
{
  "status": "error",
  "message": "Database connection error",
  "data": null
}
```

## Database Operations

### Tables Modified
1. **training_events** (training2.training_events)
   - Updated with flat fields
   - attendance_upload column stores file path

2. **event_costing** (training2.event_costing)
   - All existing records deleted (by training_id)
   - New records inserted

3. **participant** (training2.participant)
   - All existing records deleted (by training_id)
   - New records inserted

## Error Handling

- **Partial Success**: If costings or participants fail to update, training event update still succeeds
- **File Upload Errors**: Rejected with 400 status
- **Validation Errors**: Return 400 with specific message
- **Database Errors**: Return 500 with error message
- **All errors logged to console**: For debugging purposes

## File Upload Details

### File Naming
- Original filename sanitized using `sanitizeFilename()` utility
- Path structure: `uploads/trainings/{training_id}/{sanitized_filename}`
- Stored in database as: `uploads/trainings/{training_id}/{sanitized_filename}`
- Public URL: `{BACKEND_URL}/uploads/trainings/{training_id}/{sanitized_filename}`

### File Validation
- Accepts PDF files (mime-type: `application/pdf`)
- Max file size: 10MB (configurable via `UPLOAD_MAX_FILE_SIZE` env var)
- Invalid files rejected with 400 error

## Usage Example

### cURL
```bash
curl -X PUT http://localhost:3000/api/training/123 \
  -F "course_title=Advanced Data Science Workshop" \
  -F "course_id=234" \
  -F "session=morning" \
  -F "sdate=2024-06-01 09:00:00" \
  -F "edate=2024-06-05 17:00:00" \
  -F "costing_details=[{\"ec_desc\":\"Venue\",\"ec_amount\":\"2000\"}]" \
  -F "participants=[{\"participant\":\"012345\"}]" \
  -F "attendance_uploaded=@attendance.pdf"
```

### JavaScript/TypeScript
```typescript
const formData = new FormData();
formData.append('course_title', 'Advanced Data Science Workshop');
formData.append('course_id', '234');
formData.append('session', 'morning');
formData.append('sdate', '2024-06-01 09:00:00');
formData.append('edate', '2024-06-05 17:00:00');
formData.append('costing_details', JSON.stringify([...]));
formData.append('participants', JSON.stringify([...]));
formData.append('attendance_uploaded', pdfFile);

const response = await fetch('/api/training/123', {
  method: 'PUT',
  body: formData
});
```

## Route Configuration

File: `/src/p.training/trainingRoutes.ts`

```typescript
router.put('/:id', uploadTraining.single('attendance_uploaded'), asyncHandler(trainingController.updateTraining));
```

- Multer middleware: `uploadTraining.single('attendance_uploaded')`
- Stored in: `src/uploads/trainings/`
- File available as: `req.file`

## Database Schema

### training_events
```
training_id (PK)
course_title
course_id
series
session
sdate
edate
hrs
days
venue
training_count
seat
event_cost
attendance_upload
...other fields
```

### event_costing
```
costing_id (PK)
training_id (FK)
ec_desc
ec_amount
```

### participant
```
participant_id (PK)
training_id (FK)
participant (ramco_id)
```

## Implementation Notes

1. **Transactional Behavior**: Not a true transaction—if costings fail, training still updates
2. **Cascade Delete**: Participants and costings are deleted by training_id before reinsertion
3. **Duplicate Prevention**: New inserts replace old data entirely
4. **File Sanitization**: Filenames normalized to ASCII, hyphens, dots
5. **Partial Updates**: Only provided fields are updated; absent fields remain unchanged
6. **Error Resilience**: Costing/participant updates don't block training event update

## Related Endpoints

- `POST /api/training` - Create training (similar payload structure)
- `GET /api/training/:id` - Fetch training with participants enriched
- `DELETE /api/training/:id` - Delete training
- `GET /api/training/participants` - List participants with enrichment
