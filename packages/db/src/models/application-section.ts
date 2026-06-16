import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  type Sequelize,
} from 'sequelize'

export class ApplicationSection extends Model<
  InferAttributes<ApplicationSection>,
  InferCreationAttributes<ApplicationSection>
> {
  declare id: CreationOptional<string>
  declare applicationId: string
  declare section: string
  declare payload: object
  declare completedAt: CreationOptional<Date | null>
  declare updatedAt: CreationOptional<Date>

  static initModel(sequelize: Sequelize): typeof ApplicationSection {
    ApplicationSection.init(
      {
        id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        applicationId: { type: DataTypes.UUID, allowNull: false },
        section: { type: DataTypes.STRING, allowNull: false },
        payload: { type: DataTypes.JSON, allowNull: false },
        completedAt: { type: DataTypes.DATE, allowNull: true },
        updatedAt: DataTypes.DATE,
      },
      {
        sequelize,
        tableName: 'ApplicationSection',
        createdAt: false,
        updatedAt: 'updatedAt',
        indexes: [{ unique: true, fields: ['applicationId', 'section'] }],
      }
    )
    return ApplicationSection
  }
}
