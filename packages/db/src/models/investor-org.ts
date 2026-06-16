import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  type Sequelize,
} from 'sequelize'

export class InvestorOrg extends Model<
  InferAttributes<InvestorOrg>,
  InferCreationAttributes<InvestorOrg>
> {
  declare id: CreationOptional<string>
  declare legalName: string
  declare countryOfIncorporation: CreationOptional<string | null>
  declare address: CreationOptional<string | null>
  declare phone: CreationOptional<string | null>
  declare email: CreationOptional<string | null>
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>

  static initModel(sequelize: Sequelize): typeof InvestorOrg {
    InvestorOrg.init(
      {
        id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        legalName: { type: DataTypes.STRING, allowNull: false },
        countryOfIncorporation: { type: DataTypes.STRING, allowNull: true },
        address: { type: DataTypes.STRING, allowNull: true },
        phone: { type: DataTypes.STRING, allowNull: true },
        email: { type: DataTypes.STRING, allowNull: true },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      { sequelize, tableName: 'InvestorOrg', timestamps: true }
    )
    return InvestorOrg
  }
}
