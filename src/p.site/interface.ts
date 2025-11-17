interface SiteSummary {
  site_id: number;
  module: string | null;
  site_code: string | null;
  site_name: string | null;
  pma_code: string | null;
  latitude: string | null;
  longtitude: string | null;
  district: District | null;
  logger: string | null;
  site_status: string | null;
}

interface District {
  id: number;
  name: string;
}

interface Site {
  id: number;
  module: string | null;
  site_category: string | null;
  site_code: string | null;
  site_name: string | null;
  address: string | null;
  address2: string | null;
  boundary_coordinate: string | null;
  site_status: string | null;
  site_picture: string | null;
  site_schematic: string | null;
  site_certificate: string | null;
  notes: string | null;
  district: number | null;
  agency: string | null;
  wss_group: string | null;
  monitoring_group: string | null;
  area: string | null;
  type_asset: string | null;
  asset_detail: string | null;
  assign_to: string | null;
  d_brand: string | null;
  model: string | null;
  logger_serial: string | null;
  logger_sim: string | null;
  transmission: string | null;
  factor: string | null;
  offset_value: string | null;
  interval_status: string | null;
  date_installed: string | null;
  s_type: string | null;
  s_brand: string | null;
  serial_no: string | null;
  pulse: string | null;
  size: string | null;
  date_installed1: string | null;
  dirname: string | null;
  file_name_1: string | null;
  file_name_2: string | null;
  file_name_3: string | null;
  file_ext_1: string | null;
  flow: string | null;
  pressure: string | null;
  depth: string | null;
  db_id: string | null;
  attended_onsite_date: string | null;
  dmafull: string | null;
  longtitude: string;
  latitude: string;
  team_id: number | null;
  team_id2: number | null;
  last_upload: Date | null;
  main_site_code: string | null;
  mnf_baseline: number | null;
  nnf_baseline: number | null;
  dmz_baseline: number;
  cp_baseline: number | null;
  HH: number | null;
  H: number;
  L: number;
  LL: number | null;
  last_upload1: Date | null;
  file_name_4: string | null;
  date_created: string | null;
  min_mnf: number;
  max_mnf: number;
  dmz_type: string | null;
  operational_certificate: string | null;
  eit_certificate: string | null;
  ts_format: string | null;
  ts_with_0: number;
  remarks: string | null;
  data_group: number;
  age_data_feeder: number;
  datetimeYMD24H_run_data_feeder: Date;
  progname_data_feeder: string;
}

interface SiteDma extends Site {
  id: number;
  est_date: string | null;
  est_no: string | null;
  re_establish: string | null;
  pipe_length: string | null;
  connection: string | null;
  avg_pressure: string | null;
  daily_flow: string | null;
  t_factor: string | null;
  mnf_ls: string | null;
  lnf_domestic: string | null;
  lnf_commercial: string | null;
  lnf_total: string | null;
  lnf_lchr: string | null;
  nnf_ls: string | null;
  leakage: string | null;
  total_cust_bil: string | null;
  nrw_volume: string | null;
  nrw_percent: string | null;
  gis_pipe_length: string | null;
  bis_active_install: string | null;
  op_lnf_domestic: string | null;
  op_lnf_commercial: string | null;
  op_lnf_total: string | null;
  op_mnf_ls: string | null;
  op_nnf_ls: string | null;
  pm_date: string | null;
  pm_low_max: string | null;
  pm_low_min: string | null;
  pm_high_max: string | null;
  pm_high_min: string | null;
  pm_average: string | null;
  uarl: string | null;
  flow_baseline: string | null;
  asset_id: number | null;
  monitoring_status: number | null;
}

interface SiteApmc extends Site {
  id: number;
  est_date: string | null;
  est_no: string | null;
  mode_of_module: string | null;
  modulation_setting: string | null;
  controller: string | null;
  justification: string | null;
  installation_by: string | null;
  active_date: string | null;
  tuning: string | null;
  cp_code: string | null;
  cp_min: string | null;
  cp_max: string | null;
  cp_diff: string | null;
  initial_cp_setting: string | null;
  cp_setting: string | null;
  cp_longtitude: string | null;
  cp_latitude: string | null;
  cp_csv: string | null;
  asset_id: number | null;
  site_id_regulo: string | null;
  site_id_cello: string | null;
  num_of_prv: string | null;
  prv_us_max: string | null;
  prv_us_min: string | null;
  prv_ds_max: string | null;
  prv_ds_min: string | null;
  apmc_status_id: string | null;
  logger_type: string | null;
  sim_card_no: string | null;
  pmz_description: string | null;
  logger_simcard_no_cello: string | null;
  logger_serial_no_cello: string | null;
  prv_location: string | null;
}

interface SiteRms extends Site {
  id: number;
  est_date: string | null;
  est_no: string | null;
  type: string | null;
  supply_mode: string | null;
  qpump_value: string | null;
  offset: string | null;
  cal_value: string | null;
  date_install: string | null;
  alarm_date_test: string | null;
  overflow_level: string | null;
  upper_alarm: string | null;
  lower_alarm: string | null;
  ll_level: string | null;
  overflow_pipe_size: string | null;
  functionality: string | null;
  twl: string | null;
  bwl: string | null;
  capacity_mg: string | null;
  capacity_ml: string | null;
  avg_consumption: string | null;
  asset_id: number | null;
  datetime_consumption: string | null; // datetime → string
  tank_max_height: number | null; // decimal(10,2)
  water_level: number | null; // decimal(10,2)
}

interface SiteOpmc extends Site {
  id: number;
  est_date: string | null;
  est_no: string | null;
  interval_hr: number | null;
  interval_data: string | null;
  asset_id: number | null;
}

interface SiteBcm extends Site {
  id: number;
  est_date: string | null;
  est_no: string | null;
  installation_id: string | null;
  customer_name: string | null;
  account_number: string | null;
  meter_round_no: string | null;
  walk_sequence: string | null;
  installation_type: string | null;
  premise_type: string | null;
  asset_id: number | null;
}

interface SitePbrom extends Site {
  id: number;
  est_date: string | null;
  est_no: string | null;
  total_interval: string | null;
  asset_id: number | null;
}

export {
  SiteSummary,
  District,
  Site,
  SiteDma,
  SiteApmc,
  SiteRms,
  SiteOpmc,
  SiteBcm,
  SitePbrom
};