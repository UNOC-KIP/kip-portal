import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  type Sequelize,
} from 'sequelize'

export class Application extends Model<
  InferAttributes<Application>,
  InferCreationAttributes<Application>
> {
  declare id: CreationOptional<string>
  declare reference: CreationOptional<string | null>
  declare lotReference: string
  declare status: CreationOptional<string>
  declare ownerUserId: string
  declare investorOrgId: string
  declare submittedAt: CreationOptional<Date | null>
  declare decisionAt: CreationOptional<Date | null>
  declare decisionLetter: CreationOptional<string | null>
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
  declare deletedAt: CreationOptional<Date | null>

  static initModel(sequelize: Sequelize): typeof Application {
    Application.init(
      {
        id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        reference: { type: DataTypes.STRING, allowNull: true, unique: true },
        lotReference: { type: DataTypes.STRING, allowNull: false },
        status: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: 'DRAFT_PAYMENT_PENDING',
        },
        ownerUserId: { type: DataTypes.UUID, allowNull: false },
        investorOrgId: { type: DataTypes.UUID, allowNull: false },
        submittedAt: { type: DataTypes.DATE, allowNull: true },
        decisionAt: { type: DataTypes.DATE, allowNull: true },
        decisionLetter: { type: DataTypes.STRING, allowNull: true },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
        deletedAt: DataTypes.DATE,
      },
      { sequelize, tableName: 'Application', timestamps: true, paranoid: true }
    )
    return Application
  }
}
