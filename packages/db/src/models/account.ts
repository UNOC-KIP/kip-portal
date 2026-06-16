import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  type Sequelize,
} from 'sequelize'

export class Account extends Model<InferAttributes<Account>, InferCreationAttributes<Account>> {
  declare id: CreationOptional<string>
  declare userId: string
  declare type: string
  declare provider: string
  declare providerAccountId: string
  declare refresh_token: CreationOptional<string | null>
  declare access_token: CreationOptional<string | null>
  declare expires_at: CreationOptional<number | null>
  declare token_type: CreationOptional<string | null>
  declare scope: CreationOptional<string | null>
  declare id_token: CreationOptional<string | null>
  declare session_state: CreationOptional<string | null>

  static initModel(sequelize: Sequelize): typeof Account {
    Account.init(
      {
        id: { type: DataTypes.STRING, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        userId: { type: DataTypes.UUID, allowNull: false },
        type: { type: DataTypes.STRING, allowNull: false },
        provider: { type: DataTypes.STRING, allowNull: false },
        providerAccountId: { type: DataTypes.STRING, allowNull: false },
        refresh_token: { type: DataTypes.TEXT, allowNull: true },
        access_token: { type: DataTypes.TEXT, allowNull: true },
        expires_at: { type: DataTypes.INTEGER, allowNull: true },
        token_type: { type: DataTypes.STRING, allowNull: true },
        scope: { type: DataTypes.STRING, allowNull: true },
        id_token: { type: DataTypes.TEXT, allowNull: true },
        session_state: { type: DataTypes.STRING, allowNull: true },
      },
      { sequelize, tableName: 'Account', timestamps: false }
    )
    return Account
  }
}
