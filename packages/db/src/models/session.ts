import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  type Sequelize,
} from 'sequelize'

export class Session extends Model<InferAttributes<Session>, InferCreationAttributes<Session>> {
  declare id: CreationOptional<string>
  declare sessionToken: string
  declare userId: string
  declare expires: Date

  static initModel(sequelize: Sequelize): typeof Session {
    Session.init(
      {
        id: { type: DataTypes.STRING, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        sessionToken: { type: DataTypes.STRING, allowNull: false, unique: true },
        userId: { type: DataTypes.UUID, allowNull: false },
        expires: { type: DataTypes.DATE, allowNull: false },
      },
      { sequelize, tableName: 'Session', timestamps: false }
    )
    return Session
  }
}
