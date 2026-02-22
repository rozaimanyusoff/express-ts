import swaggerJsdoc from 'swagger-jsdoc';
import dotenv from 'dotenv';

dotenv.config();

// Get the port from environment variables (defaults to 3030)
const PORT = process.env.SERVER_PORT || 3030;
const DEV_URL = `http://localhost:${PORT}/api`;

const options = {
   definition: {
      openapi: '3.0.0',
      info: {
         title: 'Express TS API Documentation',
         version: '1.0.0',
         description: 'Comprehensive Enterprise Management System API Documentation',
         contact: {
            name: 'API Support',
            email: 'support@company.com'
         }
      },
      servers: [
         {
            url: DEV_URL,
            description: 'Development server'
         },
         {
            url: 'https://api.company.com/api',
            description: 'Production server'
         }
      ],
      components: {
         securitySchemes: {
            bearerAuth: {
               type: 'http',
               scheme: 'bearer',
               bearerFormat: 'JWT',
               description: 'JWT Authorization header using Bearer scheme'
            }
         },
         schemas: {
            Error: {
               type: 'object',
               properties: {
                  status: {
                     type: 'string',
                     example: 'error'
                  },
                  message: {
                     type: 'string'
                  },
                  code: {
                     type: 'integer'
                  }
               },
               required: ['status', 'message']
            },
            Success: {
               type: 'object',
               properties: {
                  status: {
                     type: 'string',
                     example: 'success'
                  },
                  message: {
                     type: 'string'
                  },
                  data: {
                     type: 'object'
                  }
               },
               required: ['status']
            },
            User: {
               type: 'object',
               properties: {
                  id: {
                     type: 'integer'
                  },
                  fname: {
                     type: 'string'
                  },
                  email: {
                     type: 'string'
                  },
                  contact: {
                     type: 'string'
                  },
                  username: {
                     type: 'string'
                  },
                  user_type: {
                     type: 'integer',
                     description: '1=Employee, 2=Customer, 3=Vendor'
                  },
                  status: {
                     type: 'integer',
                     description: '0=Inactive, 1=Active, 3=Password Reset Required'
                  },
                  activated_at: {
                     type: 'string',
                     format: 'date-time'
                  },
                  created_at: {
                     type: 'string',
                     format: 'date-time'
                  }
               }
            },
            LoginRequest: {
               type: 'object',
               properties: {
                  emailOrUsername: {
                     type: 'string'
                  },
                  password: {
                     type: 'string'
                  }
               },
               required: ['emailOrUsername', 'password']
            },
            LoginResponse: {
               type: 'object',
               properties: {
                  status: {
                     type: 'string'
                  },
                  data: {
                     type: 'object',
                     properties: {
                        token: {
                           type: 'string'
                        },
                        user: {
                           $ref: '#/components/schemas/User'
                        },
                        navigation: {
                           type: 'array',
                           items: {
                              type: 'object'
                           }
                        }
                     }
                  }
               }
            },
            RegisterRequest: {
               type: 'object',
               properties: {
                  name: {
                     type: 'string'
                  },
                  email: {
                     type: 'string'
                  },
                  contact: {
                     type: 'string'
                  },
                  userType: {
                     type: 'integer'
                  },
                  username: {
                     type: 'string'
                  }
               },
               required: ['name', 'email', 'contact', 'userType']
            },
            ActivateRequest: {
               type: 'object',
               properties: {
                  email: {
                     type: 'string'
                  },
                  contact: {
                     type: 'string'
                  },
                  activationCode: {
                     type: 'string'
                  },
                  password: {
                     type: 'string'
                  },
                  username: {
                     type: 'string'
                  }
               },
               required: ['email', 'contact', 'activationCode', 'password', 'username']
            }
         }
      },
      security: [
         {
            bearerAuth: []
         }
      ]
   },
   apis: [
      'src/p.auth/adms/authRoutes.ts',
      'src/p.user/userRoutes.ts',
      'src/p.asset/assetRoutes.ts',
      'src/p.maintenance/maintenanceRoutes.ts',
      'src/p.billing/billingRoutes.ts',
      'src/p.compliance/complianceRoutes.ts',
      'src/p.training/trainingRoutes.ts',
      'src/p.stock/rt/stockRoutes.ts',
      'src/p.stock/nrw/nrwStockRoutes.ts',
      'src/p.stock/nrw/nrwEmployeeRoutes.ts',
      'src/p.purchase/purchaseRoutes.ts',
      'src/p.project/projectRoutes.ts',
      'src/p.telco/telcoRoutes.ts',
      'src/p.admin/adminRoutes.ts',
      'src/p.admin/logsRoutes.ts',
      'src/p.notification/notificationRoutes.ts',
      'src/p.media/mediaRoutes.ts',
      'src/p.jobbank/jobreposRoutes.ts',
      'src/s.webstock/webstockRoutes.ts'
   ]
};

export const swaggerSpec = swaggerJsdoc(options);
