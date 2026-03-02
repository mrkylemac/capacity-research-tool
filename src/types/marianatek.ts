// Mariana Tek customer classes API types
// See: https://projectmood.marianatek.com/api/customer/v1/classes?...

export interface MarianaTekClassType {
  id: string;
  name: string;
  duration: number;
  duration_formatted: string;
  is_live_stream: boolean;
}

export interface MarianaTekLocation {
  id: string;
  name: string;
  timezone: string;
}

export interface MarianaTekClass {
  id: string;
  name: string;
  start_datetime: string;
  start_date: string;
  start_time: string;
  capacity: number;
  available_spot_count: number;
  class_type: MarianaTekClassType;
  classroom_name: string;
  location: MarianaTekLocation;
  is_free_class: boolean;
  spot_options?: {
    primary_availability: number;
    primary_capacity: number;
  };
}

export interface MarianaTekPagination {
  count: number;
  pages: number;
  page: number;
  per_page: number;
}

export interface MarianaTekClassesResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: MarianaTekClass[];
  meta: { pagination: MarianaTekPagination };
}

export interface MarianaTekQueryParams {
  baseUrl: string;
  locationId: string;
  regionId: string;
  minStartDate: string; // YYYY-MM-DD
  maxStartDate: string;
  pageSize?: number;
  page?: number;
}
