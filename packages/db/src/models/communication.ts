import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  type Sequelize,
} from 'sequelize'

/**
 * One admin-composed broadcast. The recipient list is materialised as
 * `Notification` rows (one per address) at create time, so this row only
 * carries the message itself plus roll-up counts — `status` is derived from how
 * those deliveries ended up.
 *
 * `filters` keeps the audience selection that produced the list, so a send can
 * be explained after the fact even once the underlying data has moved on.
 */
export class Communication extends Model<
  InferAttributes<Communication>,
  InferCreationAttributes<Communication>
> {
  declare id: CreationOptional<string>
  declare subject: string
  /** Raw authored body — markdown-lite. Rendered by `renderBodyHtml()`. */
  declare body: string
  /** A `CommunicationChannel` value. */
  declare channel: CreationOptional<string>
  /** A `CommunicationAudience` value. */
  declare audience: string
  /** Human-readable audience description, e.g. "Heavy Industrial · Shortlisted". */
  declare audienceSummary: CreationOptional<string | null>
  declare filters: CreationOptional<object | null>
  /** A `CommunicationStatus` value. */
  declare status: CreationOptional<string>
  declare recipientCount: CreationOptional<number>
  declare sentCount: CreationOptional<number>
  declare failedCount: CreationOptional<number>
  declare templateId: CreationOptional<string | null>
  declare createdById: CreationOptional<string | null>
  declare sentAt: CreationOptional<Date | null>
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>

  static initModel(sequelize: Sequelize): typeof Communication {
    Communication.init(
      {
        id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        subject: { type: DataTypes.TEXT, allowNull: false },
        body: { type: DataTypes.TEXT, allowNull: false },
        channel: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: 'EMAIL_AND_IN_APP',
        },
        audience: { type: DataTypes.STRING, allowNull: false },
        audienceSummary: { type: DataTypes.TEXT, allowNull: true },
        filters: { type: DataTypes.JSONB, allowNull: true },
        status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'SENDING' },
        recipientCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        sentCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        failedCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        templateId: { type: DataTypes.UUID, allowNull: true },
        createdById: { type: DataTypes.UUID, allowNull: true },
        sentAt: { type: DataTypes.DATE, allowNull: true },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      { sequelize, tableName: 'Communication', timestamps: true }
    )
    return Communication
  }
}
