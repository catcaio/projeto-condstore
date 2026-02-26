export interface BaseFilterSchema {
    q?: string;
    page?: string;
    limit?: string;
    sort?: string;
    order?: string;
    dateStart?: string;
    dateEnd?: string;
}

export const BASE_FILTER_KEYS = ['q', 'page', 'limit', 'sort', 'order', 'dateStart', 'dateEnd'];
