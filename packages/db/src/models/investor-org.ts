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
  declare tradingName: CreationOptional<string | null>
  declare registrationNumber: CreationOptional<string | null>
  declare ursbRegistrationNumber: CreationOptional<string | null>
  declare companyType: CreationOptional<string | null>
  declare businessSector: CreationOptional<string | null>
  declare countryOfIncorporation: CreationOptional<string | null>
  declare tin: CreationOptional<string | null>
  declare address: CreationOptional<string | null>
  declare phone: CreationOptional<string | null>
  declare email: CreationOptional<string | null>
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
  declare deletedAt: CreationOptional<Date | null>

  static initModel(sequelize: Sequelize): typeof InvestorOrg {
    InvestorOrg.init(
      {
        id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        legalName: { type: DataTypes.STRING, allowNull: false },
        tradingName: { type: DataTypes.STRING, allowNull: true },
        registrationNumber: { type: DataTypes.STRING, allowNull: true },
        ursbRegistrationNumber: { type: DataTypes.STRING, allowNull: true },
        companyType: { type: DataTypes.STRING, allowNull: true },
        businessSector: { type: DataTypes.STRING, allowNull: true },
        countryOfIncorporation: { type: DataTypes.STRING, allowNull: true },
        tin: { type: DataTypes.STRING, allowNull: true },
        address: { type: DataTypes.STRING, allowNull: true },
        phone: { type: DataTypes.STRING, allowNull: true },
        email: { type: DataTypes.STRING, allowNull: true },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
        deletedAt: DataTypes.DATE,
      },
      { sequelize, tableName: 'InvestorOrg', timestamps: true, paranoid: true }
    )
    return InvestorOrg
  }
}
