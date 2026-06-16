import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  type Sequelize,
} from 'sequelize'

export class Notification extends Model<
  InferAttributes<Notification>,
  InferCreationAttributes<Notification>
> {
  declare id: CreationOptional<string>
  declare userId: string
  declare channel: string
  declare subject: string
  declare body: string
  declare meta: CreationOptional<object | null>
  declare readAt: CreationOptional<Date | null>
  declare sentAt: CreationOptional<Date | null>
  declare createdAt: CreationOptional<Date>

  static initModel(sequelize: Sequelize): typeof Notification {
    Notification.init(
      {
        id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        userId: { type: DataTypes.UUID, allowNull: false },
        channel: { type: DataTypes.STRING, allowNull: false },
        subject: { type: DataTypes.STRING, allowNull: false },
        body: { type: DataTypes.TEXT, allowNull: false },
        meta: { type: DataTypes.JSON, allowNull: true },
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
