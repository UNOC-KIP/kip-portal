import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  type Sequelize,
} from 'sequelize'

/**
 * One delivery of one `Communication` to one recipient.
 *
 * Doubles as the investor Messages inbox row: when `userId` is set and the
 * channel includes the portal, the portal reads these rows and `readAt` is the
 * read receipt. `userId` is nullable because notify-list recipients are bare
 * email addresses with no `User` row — for those, `email` is the only address.
 *
 * `body` is stored already merge-rendered for this recipient, so the inbox and
 * the email they received always say exactly the same thing.
 */
export class Notification extends Model<
  InferAttributes<Notification>,
  InferCreationAttributes<Notification>
> {
  declare id: CreationOptional<string>
  declare userId: CreationOptional<string | null>
  declare communicationId: CreationOptional<string | null>
  /** Send address. Set even when `userId` is present, in case the user's email changes. */
  declare email: CreationOptional<string | null>
  /** A `CommunicationChannel` value. */
  declare channel: string
  declare subject: string
  declare body: string
  declare meta: CreationOptional<object | null>
  /** A `DeliveryStatus` value. */
  declare status: CreationOptional<string>
  /** SMTP failure reason, truncated. Null unless `status` is FAILED. */
  declare error: CreationOptional<string | null>
  declare readAt: CreationOptional<Date | null>
  declare sentAt: CreationOptional<Date | null>
  declare createdAt: CreationOptional<Date>

  static initModel(sequelize: Sequelize): typeof Notification {
    Notification.init(
      {
        id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        userId: { type: DataTypes.UUID, allowNull: true },
        communicationId: { type: DataTypes.UUID, allowNull: true },
        email: { type: DataTypes.STRING, allowNull: true },
        channel: { type: DataTypes.STRING, allowNull: false },
        subject: { type: DataTypes.STRING, allowNull: false },
        body: { type: DataTypes.TEXT, allowNull: false },
        meta: { type: DataTypes.JSON, allowNull: true },
        status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'PENDING' },
        error: { type: DataTypes.TEXT, allowNull: true },
        readAt: { type: DataTypes.DATE, allowNull: true },
        sentAt: { type: DataTypes.DATE, allowNull: true },
        createdAt: DataTypes.DATE,
      },
      {
        sequelize,
        tableName: 'Notification',
        createdAt: 'createdAt',
        updatedAt: false,
      }
    )
    return Notification
  }
}
