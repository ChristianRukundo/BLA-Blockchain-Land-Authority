export enum NotificationType {
  // Authentication & User
  ACCOUNT_CREATED = 'ACCOUNT_CREATED',
  EMAIL_VERIFIED = 'EMAIL_VERIFIED',
  PASSWORD_RESET = 'PASSWORD_RESET',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  LOGIN_ATTEMPT = 'LOGIN_ATTEMPT',
  TWO_FACTOR_ENABLED = 'TWO_FACTOR_ENABLED',
  TWO_FACTOR_DISABLED = 'TWO_FACTOR_DISABLED',
  PROFILE_UPDATED = 'PROFILE_UPDATED',
  WELCOME = 'WELCOME',

  // Governance
  PROPOSAL_CREATED = 'PROPOSAL_CREATED',
  PROPOSAL_UPDATED = 'PROPOSAL_UPDATED',
  VOTE_CAST = 'VOTE_CAST',
  PROPOSAL_SUCCEEDED = 'PROPOSAL_SUCCEEDED',
  PROPOSAL_DEFEATED = 'PROPOSAL_DEFEATED',
  PROPOSAL_QUEUED = 'PROPOSAL_QUEUED',
  PROPOSAL_EXECUTED = 'PROPOSAL_EXECUTED',
  PROPOSAL_CANCELLED = 'PROPOSAL_CANCELLED',
  PROPOSAL_EXPIRED = 'PROPOSAL_EXPIRED',
  PROPOSAL_VOTING_STARTED = 'PROPOSAL_VOTING_STARTED',
  PROPOSAL_VOTING_ENDING = 'PROPOSAL_VOTING_ENDING',

  // Inheritance
  INHERITANCE_DESIGNATED = 'INHERITANCE_DESIGNATED',
  INHERITANCE_UPDATED = 'INHERITANCE_UPDATED',
  INHERITANCE_CANCELLED = 'INHERITANCE_CANCELLED',
  INHERITANCE_REQUEST_CREATED = 'INHERITANCE_REQUEST_CREATED',
  INHERITANCE_APPROVED = 'INHERITANCE_APPROVED',
  INHERITANCE_REJECTED = 'INHERITANCE_REJECTED',
  INHERITANCE_COMPLETED = 'INHERITANCE_COMPLETED',
  INHERITANCE_DISPUTED = 'INHERITANCE_DISPUTED',

  // Land Registry
  LAND_PARCEL_CREATED = 'LAND_PARCEL_CREATED',
  LAND_PARCEL_UPDATED = 'LAND_PARCEL_UPDATED',
  LAND_PARCEL_TRANSFERRED = 'LAND_PARCEL_TRANSFERRED',
  LAND_PARCEL_LISTED = 'LAND_PARCEL_LISTED',
  LAND_PARCEL_SOLD = 'LAND_PARCEL_SOLD',
  PARCEL_TRANSFER_RECEIVED = 'PARCEL_TRANSFER_RECEIVED',
  PARCEL_TRANSFER_SENT = 'PARCEL_TRANSFER_SENT',

  // Expropriation
  EXPROPRIATION_FLAGGED = 'EXPROPRIATION_FLAGGED',
  EXPROPRIATION_STATUS_UPDATE = 'EXPROPRIATION_STATUS_UPDATE',
  EXPROPRIATION_COMPLETED = 'EXPROPRIATION_COMPLETED',
  EXPROPRIATION_CANCELLED = 'EXPROPRIATION_CANCELLED',
  COMPENSATION_DEPOSITED = 'COMPENSATION_DEPOSITED',
  EXPROPRIATION_COMPENSATION_DEPOSITED = 'EXPROPRIATION_COMPENSATION_DEPOSITED',
  COMPENSATION_CLAIMED = 'COMPENSATION_CLAIMED',

  // Compliance
  COMPLIANCE_VIOLATION = 'COMPLIANCE_VIOLATION',

  // Dispute
  DISPUTE_CREATED = 'DISPUTE_CREATED',
  DISPUTE_RECEIVED = 'DISPUTE_RECEIVED',
  DISPUTE_RESOLVED = 'DISPUTE_RESOLVED',
  DISPUTE_REJECTED = 'DISPUTE_REJECTED',
  DISPUTE_APPEALED = 'DISPUTE_APPEALED',

  // Marketplace
  OFFER_RECEIVED = 'OFFER_RECEIVED',
  OFFER_ACCEPTED = 'OFFER_ACCEPTED',
  OFFER_REJECTED = 'OFFER_REJECTED',
  SALE_COMPLETED = 'SALE_COMPLETED',

  // System
  SYSTEM_MAINTENANCE = 'SYSTEM_MAINTENANCE',
  SYSTEM_UPGRADE = 'SYSTEM_UPGRADE',
  CONTRACT_UPGRADE = 'CONTRACT_UPGRADE',
  SECURITY_ALERT = 'SECURITY_ALERT',

  // General
  GENERAL_NOTIFICATION = 'GENERAL_NOTIFICATION',
  GENERIC_NOTIFICATION = 'GENERIC_NOTIFICATION',


  ADMIN_ACTION_REJECTED = 'ADMIN_ACTION_REJECTED',
  ADMIN_ACTION_APPROVED = 'ADMIN_ACTION_APPROVED',
  ADMIN_ACTION_EXECUTED = 'ADMIN_ACTION_EXECUTED',
  ADMIN_ACTION_CANCELLED = 'ADMIN_ACTION_CANCELLED',
  ADMIN_ACTION_CREATED = 'ADMIN_ACTION_CREATED',


    // Dispute Module
  DISPUTE_RAISED = 'DISPUTE_RAISED',
  DISPUTE_STATUS_UPDATED = 'DISPUTE_STATUS_UPDATED',
  DISPUTE_EVIDENCE_SUBMITTED = 'DISPUTE_EVIDENCE_SUBMITTED',
  DISPUTE_SUBMITTED_TO_ARBITRATION = 'DISPUTE_SUBMITTED_TO_ARBITRATION', // e.g., Kleros
  DISPUTE_RULING_RECEIVED = 'DISPUTE_RULING_RECEIVED',
  DISPUTE_RULING_EXECUTED = 'DISPUTE_RULING_EXECUTED',
  DISPUTE_SETTLED = 'DISPUTE_SETTLED',
  DISPUTE_CANCELLED = 'DISPUTE_CANCELLED',

  COMPLIANCE_REPORT_SUBMITTED = 'COMPLIANCE_REPORT_SUBMITTED',
  COMPLIANCE_STATUS_UPDATED_VIA_REPORT = 'COMPLIANCE_STATUS_UPDATED_VIA_REPORT', // When a report changes parcel's compliance
  COMPLIANCE_REPORT_REVIEWED = 'COMPLIANCE_REPORT_REVIEWED',
  COMPLIANCE_FINE_ISSUED = 'COMPLIANCE_FINE_ISSUED',
  COMPLIANCE_INCENTIVE_AWARDED = 'COMPLIANCE_INCENTIVE_AWARDED',
  COMPLIANCE_REMINDER_DUE = 'COMPLIANCE_REMINDER_DUE',







}

export enum NotificationStatus {
  UNREAD = 'UNREAD',
  READ = 'READ',
  ARCHIVED = 'ARCHIVED',
  DELETED = 'DELETED',
  PENDING = 'PENDING',
  FAILED = 'FAILED',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  ERROR = 'ERROR',
}
export enum NotificationFrequency {
  IMMEDIATE = 'IMMEDIATE',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  NEVER = 'NEVER',
}

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  WEBHOOK = 'WEBHOOK',
  WEB = 'web',
}

export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}