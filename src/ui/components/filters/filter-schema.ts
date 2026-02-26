export interface FilterSchema {
    q?: string;
    type?: string;
    status?: string;
    actor?: string;
    resource?: string;
    dateStart?: string;
    dateEnd?: string;
    [key: string]: string | undefined;
}
