export interface TrackingTimelineEvent {
  status: string
  timestamp: string
  location?: string
  description: string
}

export interface PublicTrackingResponse {
  invoiceNumber: string
  status: string
  originCity: string
  destinationCity: string
  receiverName?: string
  scheduledShipmentDate?: string
  estimatedDeliveryDate?: string
  timelineEvents: TrackingTimelineEvent[]
  statusHistory: TrackingTimelineEvent[]
}
