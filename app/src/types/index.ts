export type Status = 'active' | 'inactive'
export type CultivationStatus = 'planned' | 'growing' | 'completed' | 'failed'
export interface Field { fieldId: string; name: string; area: number; location?: string; latitude?: number; longitude?: number; soilType?: string; drainage?: string; sunlight?: string; status: Status; note?: string }
export interface Area { areaId: string; fieldId: string; name: string; areaSize: number; position?: string; status: Status; note?: string }
export interface Crop { cropId: string; name: string; category?: string; active: boolean; note?: string }
export interface Cultivation { cultivationId: string; fieldId: string; areaId: string; cropId: string; cropName?: string; fieldName?: string; areaName?: string; year: number; variety?: string; season?: string; sowingDate?: string; plantingDate?: string; harvestStartDate?: string; harvestEndDate?: string; completedDate?: string; status: CultivationStatus; note?: string }
export interface WorkLog { workLogId: string; cultivationId: string; date: string; workType: string; description?: string; workMinutes?: number; workerCount?: number; materials?: string[]; tools?: string[]; weather?: string; temperature?: number; soilCondition?: string; beforeCondition?: string; afterCondition?: string; note?: string }
export interface Harvest { harvestId: string; cultivationId: string; harvestDate: string; quantity: number; unit: string; saleQuantity?: number; selfConsumptionQuantity?: number; discardQuantity?: number; sales?: number; salesChannel?: string; note?: string }
export interface Photo { photoId: string; cultivationId: string; caption?: string; url?: string; createdAt?: string }
export interface PagedResponse<T> { items: T[]; nextToken?: string | null }
export class ApiError extends Error { constructor(public status: number, message: string, public code?: string) { super(message) } }
