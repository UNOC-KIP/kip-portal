import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  type Sequelize,
} from 'sequelize'

export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: CreationOptional<string>
  declare email: string
  declare emailVerified: CreationOptional<Date | null>
  declare passwordHash: CreationOptional<string | null>
  declare name: CreationOptional<string | null>
  declare designation: CreationOptional<string | null>
  declare phone: CreationOptional<string | null>
  declare role: CreationOptional<string>
  declare status: CreationOptional<string>
  declare investorOrgId: CreationOptional<string | null>
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
  declare deletedAt: CreationOptional<Date | null>

  static initModel(sequelize: Sequelize): typeof User {
    User.init(
      {
        id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        email: { type: DataTypes.STRING, allowNull: false, unique: true },
        emailVerified: { type: DataTypes.DATE, allowNull: true },
        passwordHash: { type: DataTypes.STRING, allowNull: true },
        name: { type: DataTypes.STRING, allowNull: true },
        designation: { type: DataTypes.STRING, allowNull: true },
        phone: { type: DataTypes.STRING, allowNull: true },
        role: { type: DataTypes.STRING, allowNull: false, defaultValue: 'INVESTOR' },
        status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'PENDING_REVIEW' },
        investorOrgId: { type: DataTypes.UUID, allowNull: true },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
        deletedAt: DataTypes.DATE,
      },
      { sequelize, tableName: 'User', timestamps: true, paranoid: true }
    )
    return User
  }
}
