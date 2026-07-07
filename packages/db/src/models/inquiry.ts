import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  type Sequelize,
} from 'sequelize'

/**
 * Public inquiry — a contact-form submission or live-chat message from the
 * investor portal. Persisted so no inquiry is lost when email delivery is
 * unavailable; admins track and respond manually from the console.
 */
export class Inquiry extends Model<InferAttributes<Inquiry>, InferCreationAttributes<Inquiry>> {
  declare id: CreationOptional<string>
  declare name: string
  declare email: string
  declare company: CreationOptional<string | null>
  declare subject: CreationOptional<string | null>
  declare message: string
  declare channel: string
  declare status: CreationOptional<string>
  declare respondedById: CreationOptional<string | null>
  declare respondedAt: CreationOptional<Date | null>
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>

  static initModel(sequelize: Sequelize): typeof Inquiry {
    Inquiry.init(
      {
        id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        name: { type: DataTypes.STRING, allowNull: false },
        email: { type: DataTypes.STRING, allowNull: false },
        company: { type: DataTypes.STRING, allowNull: true },
        subject: { type: DataTypes.STRING, allowNull: true },
        message: { type: DataTypes.TEXT, allowNull: false },
        channel: { type: DataTypes.STRING, allowNull: false },
        status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'NEW' },
        respondedById: { type: DataTypes.UUID, allowNull: true },
        respondedAt: { type: DataTypes.DATE, allowNull: true },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      { sequelize, tableName: 'Inquiry', timestamps: true }
    )
    return Inquiry
  }
}
