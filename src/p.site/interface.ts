interface District {
  id: number;
  name: string;
}

interface Site {
  address: null | string;
  address2: null | string;
  age_data_feeder: number;
  agency: null | string;
  area: null | string;
  asset_detail: null | string;
  assign_to: null | string;
  attended_onsite_date: null | string;
  boundary_coordinate: null | string;
  cp_baseline: null | number;
  d_brand: null | string;
  data_group: number;
  date_created: null | string;
  date_installed: null | string;
  date_installed1: null | string;
  datetimeYMD24H_run_data_feeder: Date;
  db_id: null | string;
  depth: null | string;
  dirname: null | string;
  district: null | number;
  dmafull: null | string;
  dmz_baseline: number;
  dmz_type: null | string;
  eit_certificate: null | string;
  factor: null | string;
  file_ext_1: null | string;
  file_name_1: null | string;
  file_name_2: null | string;
  file_name_3: null | string;
  file_name_4: null | string;
  flow: null | string;
  H: number;
  HH: null | number;
  id: number;
  interval_status: null | string;
  L: number;
  last_upload: Date | null;
  last_upload1: Date | null;
  latitude: string;
  LL: null | number;
  logger_serial: null | string;
  logger_sim: null | string;
  longtitude: string;
  main_site_code: null | string;
  max_mnf: number;
  min_mnf: number;
  mnf_baseline: null | number;
  model: null | string;
  module: null | string;
  monitoring_group: null | string;
  nnf_baseline: null | number;
  notes: null | string;
  offset_value: null | string;
  operational_certificate: null | string;
  pressure: null | string;
  progname_data_feeder: string;
  pulse: null | string;
  remarks: null | string;
  s_brand: null | string;
  s_type: null | string;
  serial_no: null | string;
  site_category: null | string;
  site_certificate: null | string;
  site_code: null | string;
  site_name: null | string;
  site_picture: null | string;
  site_schematic: null | string;
  site_status: null | string;
  size: null | string;
  team_id: null | number;
  team_id2: null | number;
  transmission: null | string;
  ts_format: null | string;
  ts_with_0: number;
  type_asset: null | string;
  wss_group: null | string;
}

interface SiteApmc extends Site {
  active_date: null | string;
  apmc_status_id: null | string;
  asset_id: null | number;
  controller: null | string;
  cp_code: null | string;
  cp_csv: null | string;
  cp_diff: null | string;
  cp_latitude: null | string;
  cp_longtitude: null | string;
  cp_max: null | string;
  cp_min: null | string;
  cp_setting: null | string;
  est_date: null | string;
  est_no: null | string;
  id: number;
  initial_cp_setting: null | string;
  installation_by: null | string;
  justification: null | string;
  logger_serial_no_cello: null | string;
  logger_simcard_no_cello: null | string;
  logger_type: null | string;
  mode_of_module: null | string;
  modulation_setting: null | string;
  num_of_prv: null | string;
  pmz_description: null | string;
  prv_ds_max: null | string;
  prv_ds_min: null | string;
  prv_location: null | string;
  prv_us_max: null | string;
  prv_us_min: null | string;
  sim_card_no: null | string;
  site_id_cello: null | string;
  site_id_regulo: null | string;
  tuning: null | string;
}

interface SiteBcm extends Site {
  account_number: null | string;
  asset_id: null | number;
  customer_name: null | string;
  est_date: null | string;
  est_no: null | string;
  id: number;
  installation_id: null | string;
  installation_type: null | string;
  meter_round_no: null | string;
  premise_type: null | string;
  walk_sequence: null | string;
}

interface SiteDma extends Site {
  asset_id: null | number;
  avg_pressure: null | string;
  bis_active_install: null | string;
  connection: null | string;
  daily_flow: null | string;
  est_date: null | string;
  est_no: null | string;
  flow_baseline: null | string;
  gis_pipe_length: null | string;
  id: number;
  leakage: null | string;
  lnf_commercial: null | string;
  lnf_domestic: null | string;
  lnf_lchr: null | string;
  lnf_total: null | string;
  mnf_ls: null | string;
  monitoring_status: null | number;
  nnf_ls: null | string;
  nrw_percent: null | string;
  nrw_volume: null | string;
  op_lnf_commercial: null | string;
  op_lnf_domestic: null | string;
  op_lnf_total: null | string;
  op_mnf_ls: null | string;
  op_nnf_ls: null | string;
  pipe_length: null | string;
  pm_average: null | string;
  pm_date: null | string;
  pm_high_max: null | string;
  pm_high_min: null | string;
  pm_low_max: null | string;
  pm_low_min: null | string;
  re_establish: null | string;
  t_factor: null | string;
  total_cust_bil: null | string;
  uarl: null | string;
}

interface SiteOpmc extends Site {
  asset_id: null | number;
  est_date: null | string;
  est_no: null | string;
  id: number;
  interval_data: null | string;
  interval_hr: null | number;
}

interface SitePbrom extends Site {
  asset_id: null | number;
  est_date: null | string;
  est_no: null | string;
  id: number;
  total_interval: null | string;
}

interface SiteRms extends Site {
  alarm_date_test: null | string;
  asset_id: null | number;
  avg_consumption: null | string;
  bwl: null | string;
  cal_value: null | string;
  capacity_mg: null | string;
  capacity_ml: null | string;
  date_install: null | string;
  datetime_consumption: null | string; // datetime → string
  est_date: null | string;
  est_no: null | string;
  functionality: null | string;
  id: number;
  ll_level: null | string;
  lower_alarm: null | string;
  offset: null | string;
  overflow_level: null | string;
  overflow_pipe_size: null | string;
  qpump_value: null | string;
  supply_mode: null | string;
  tank_max_height: null | number; // decimal(10,2)
  twl: null | string;
  type: null | string;
  upper_alarm: null | string;
  water_level: null | number; // decimal(10,2)
}

interface SiteSummary {
  district: District | null;
  latitude: null | string;
  logger: null | string;
  longtitude: null | string;
  module: null | string;
  pma_code: null | string;
  site_code: null | string;
  site_id: number;
  site_name: null | string;
  site_status: null | string;
}

export {
  District,
  Site,
  SiteApmc,
  SiteBcm,
  SiteDma,
  SiteOpmc,
  SitePbrom,
  SiteRms,
  SiteSummary
};