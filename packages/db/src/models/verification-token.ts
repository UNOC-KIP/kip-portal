import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  type Sequelize,
} from 'sequelize'

export class VerificationToken extends Model<
  InferAttributes<VerificationToken>,
  InferCreationAttributes<VerificationToken>
> {
  declare identifier: string
  declare token: string
  declare expires: Date

  static initModel(sequelize: Sequelize): typeof VerificationToken {
    VerificationToken.init(
      {
        identifier: { type: DataTypes.STRING, allowNull: false },
        token: { type: DataTypes.STRING, allowNull: false, unique: true },
        expires: { type: DataTypes.DATE, allowNull: false },
      },
      {
        sequelize,
        tableName: 'VerificationToken',
        timestamps: false,
        // Compound primary key — no single PK column in Prisma's schema
        indexes: [{ unique: true, fields: ['identifier', 'token'] }],
      }
    )
    return VerificationToken
  }
}
