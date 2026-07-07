import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  type Sequelize,
} from 'sequelize'

/**
 * "Notify me" signup from the portal home page — an email address to alert
 * when the next application window opens. One row per email (unique).
 */
export class NotifySignup extends Model<
  InferAttributes<NotifySignup>,
  InferCreationAttributes<NotifySignup>
> {
  declare id: CreationOptional<string>
  declare email: string
  declare notifiedAt: CreationOptional<Date | null>
  declare createdAt: CreationOptional<Date>

  static initModel(sequelize: Sequelize): typeof NotifySignup {
    NotifySignup.init(
      {
        id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        email: { type: DataTypes.STRING, allowNull: false, unique: true },
        notifiedAt: { type: DataTypes.DATE, allowNull: true },
        createdAt: DataTypes.DATE,
      },
      {
        sequelize,
        tableName: 'NotifySignup',
        createdAt: 'createdAt',
        updatedAt: false,
      }
    )
    return NotifySignup
  }
}
