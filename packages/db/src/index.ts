import { Sequelize } from 'sequelize'
// Static imports so serverless bundlers (Vercel/nft) trace pg into the
// function bundle — Sequelize itself loads the dialect via dynamic require,
// which file tracing cannot follow.
import * as pg from 'pg'
import { User } from './models/user'
import { Account } from './models/account'
import { Session } from './models/session'
import { VerificationToken } from './models/verification-token'
import { InvestorOrg } from './models/investor-org'
import { ApplicationWindow } from './models/application-window'
import { Application } from './models/application'
import { ApplicationSection } from './models/application-section'
import { Document } from './models/document'
import { Payment } from './models/payment'
import { ReviewAction } from './models/review-action'
import { ClarificationRequest } from './models/clarification-request'
import { Notification } from './models/notification'
import { Inquiry } from './models/inquiry'
import { NotifySignup } from './models/notify-signup'
import { SiteVisitBooking } from './models/site-visit-booking'

const globalForDb = globalThis as unknown as { sequelize: Sequelize | undefined }

import { databaseNeedsSsl } from './ssl'

export { databaseNeedsSsl }

function createSequelize(): Sequelize {
  const url = process.env.DATABASE_URL!
  const sslRequired = databaseNeedsSsl(url)
  return new Sequelize(url, {
    dialect: 'postgres',
    dialectModule: pg,
    logging: process.env.NODE_ENV === 'development' ? false : false,
    dialectOptions: sslRequired
      ? { ssl: { require: true, rejectUnauthorized: false } }
      : undefined,
    define: {
      freezeTableName: true,
      underscored: false,
    },
  })
}

export const sequelize = globalForDb.sequelize ?? createSequelize()
if (process.env.NODE_ENV !== 'production') globalForDb.sequelize = sequelize

// ─── Initialise models ───────────────────────────────────────────────────────

User.initModel(sequelize)
Account.initModel(sequelize)
Session.initModel(sequelize)
VerificationToken.initModel(sequelize)
InvestorOrg.initModel(sequelize)
ApplicationWindow.initModel(sequelize)
Application.initModel(sequelize)
ApplicationSection.initModel(sequelize)
Document.initModel(sequelize)
Payment.initModel(sequelize)
ReviewAction.initModel(sequelize)
ClarificationRequest.initModel(sequelize)
Notification.initModel(sequelize)
Inquiry.initModel(sequelize)
NotifySignup.initModel(sequelize)
SiteVisitBooking.initModel(sequelize)

// ─── Associations ────────────────────────────────────────────────────────────

User.belongsTo(InvestorOrg, { foreignKey: 'investorOrgId', as: 'investorOrg' })
InvestorOrg.hasMany(User, { foreignKey: 'investorOrgId' })

User.hasMany(Application, { foreignKey: 'ownerUserId', as: 'applications' })
Application.belongsTo(User, { foreignKey: 'ownerUserId', as: 'owner' })

InvestorOrg.hasMany(Application, { foreignKey: 'investorOrgId' })
Application.belongsTo(InvestorOrg, { foreignKey: 'investorOrgId', as: 'investorOrg' })

Application.hasMany(ApplicationSection, { foreignKey: 'applicationId', as: 'sections' })
ApplicationSection.belongsTo(Application, { foreignKey: 'applicationId' })

Application.hasMany(Document, { foreignKey: 'applicationId', as: 'documents' })
Document.belongsTo(Application, { foreignKey: 'applicationId' })

Application.hasMany(Payment, { foreignKey: 'applicationId', as: 'payments' })
Payment.belongsTo(Application, { foreignKey: 'applicationId' })

Application.hasMany(ReviewAction, { foreignKey: 'applicationId', as: 'reviewActions' })
ReviewAction.belongsTo(Application, { foreignKey: 'applicationId' })

Application.hasMany(ClarificationRequest, {
  foreignKey: 'applicationId',
  as: 'clarificationRequests',
})
ClarificationRequest.belongsTo(Application, { foreignKey: 'applicationId' })

User.hasMany(ReviewAction, { foreignKey: 'actorUserId' })
ReviewAction.belongsTo(User, { foreignKey: 'actorUserId', as: 'actor' })

User.hasMany(ClarificationRequest, {
  foreignKey: 'requestedById',
  as: 'requestedClarifications',
})
ClarificationRequest.belongsTo(User, { foreignKey: 'requestedById', as: 'requestedBy' })

User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' })
Notification.belongsTo(User, { foreignKey: 'userId' })

User.hasMany(Inquiry, { foreignKey: 'respondedById', as: 'respondedInquiries' })
Inquiry.belongsTo(User, { foreignKey: 'respondedById', as: 'respondedBy' })

User.hasMany(SiteVisitBooking, { foreignKey: 'userId', as: 'siteVisitBookings' })
SiteVisitBooking.belongsTo(User, { foreignKey: 'userId', as: 'user' })
SiteVisitBooking.belongsTo(User, { foreignKey: 'handledById', as: 'handledBy' })
SiteVisitBooking.belongsTo(InvestorOrg, { foreignKey: 'investorOrgId', as: 'investorOrg' })

User.hasMany(Account, { foreignKey: 'userId', as: 'accounts' })
Account.belongsTo(User, { foreignKey: 'userId', as: 'user' })

User.hasMany(Session, { foreignKey: 'userId', as: 'sessions' })
Session.belongsTo(User, { foreignKey: 'userId', as: 'user' })

// ─── Exports ─────────────────────────────────────────────────────────────────

export {
  User,
  Account,
  Session,
  VerificationToken,
  InvestorOrg,
  ApplicationWindow,
  Application,
  ApplicationSection,
  Document,
  Payment,
  ReviewAction,
  ClarificationRequest,
  Notification,
  Inquiry,
  NotifySignup,
  SiteVisitBooking,
}
