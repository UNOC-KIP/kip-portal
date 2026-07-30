import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  type Sequelize,
} from 'sequelize'

/**
 * A reusable subject + body an admin can load into the composer. Bodies may
 * contain `{{company}}`-style merge tokens (see `MERGE_TOKENS` in
 * `@kip/shared`), which are substituted per recipient at send time.
 */
export class CommunicationTemplate extends Model<
  InferAttributes<CommunicationTemplate>,
  InferCreationAttributes<CommunicationTemplate>
> {
  declare id: CreationOptional<string>
  declare name: string
  declare subject: string
  declare body: string
  declare description: CreationOptional<string | null>
  declare createdById: CreationOptional<string | null>
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>

  static initModel(sequelize: Sequelize): typeof CommunicationTemplate {
    CommunicationTemplate.init(
      {
        id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        name: { type: DataTypes.STRING, allowNull: false, unique: true },
        subject: { type: DataTypes.TEXT, allowNull: false },
        body: { type: DataTypes.TEXT, allowNull: false },
        description: { type: DataTypes.TEXT, allowNull: true },
        createdById: { type: DataTypes.UUID, allowNull: true },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      { sequelize, tableName: 'CommunicationTemplate', timestamps: true }
    )
    return CommunicationTemplate
  }
}
