import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  type Sequelize,
} from 'sequelize'

/**
 * A co-venturer on a joint-venture application. When an applicant applies as a
 * joint venture, several companies come together — each is captured here with
 * the same business-profile fields an InvestorOrg carries, so the committee
 * sees every venture's identity, incorporation and contacts. Documents attach
 * to a partner via Document.partnerId. Application-scoped (not an account, not
 * paranoid): it becomes unreachable when the parent Application is soft-deleted.
 */
export class ApplicationPartner extends Model<
  InferAttributes<ApplicationPartner>,
  InferCreationAttributes<ApplicationPartner>
> {
  declare id: CreationOptional<string>
  declare applicationId: string
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
  /** The lead venture that fronts the application (one per JV). */
  declare isLead: CreationOptional<boolean>
  /** Display order in the venture list. */
  declare position: CreationOptional<number>
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>

  static initModel(sequelize: Sequelize): typeof ApplicationPartner {
    ApplicationPartner.init(
      {
        id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        applicationId: { type: DataTypes.UUID, allowNull: false },
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
        isLead: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      { sequelize, tableName: 'ApplicationPartner', timestamps: true }
    )
    return ApplicationPartner
  }
}
