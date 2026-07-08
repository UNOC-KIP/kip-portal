import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  type Sequelize,
} from 'sequelize'

export class Payment extends Model<
  InferAttributes<Payment>,
  InferCreationAttributes<Payment>
> {
  declare id: CreationOptional<string>
  declare applicationId: string
  declare method: string
  declare status: CreationOptional<string>
  declare currency: string
  declare amount: string  // DECIMAL comes back as string from pg
  declare gatewayRef: CreationOptional<string | null>
  declare transferRef: CreationOptional<string | null>
  declare proofDocumentId: CreationOptional<string | null>
  declare paidAt: CreationOptional<Date | null>
  declare confirmedAt: CreationOptional<Date | null>
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
  declare deletedAt: CreationOptional<Date | null>

  static initModel(sequelize: Sequelize): typeof Payment {
    Payment.init(
      {
        id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        applicationId: { type: DataTypes.UUID, allowNull: false },
        method: { type: DataTypes.STRING, allowNull: false },
        status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'PENDING' },
        currency: { type: DataTypes.STRING, allowNull: false },
        amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
        gatewayRef: { type: DataTypes.STRING, allowNull: true },
        transferRef: { type: DataTypes.STRING, allowNull: true },
        proofDocumentId: { type: DataTypes.UUID, allowNull: true },
        paidAt: { type: DataTypes.DATE, allowNull: true },
        confirmedAt: { type: DataTypes.DATE, allowNull: true },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
        deletedAt: DataTypes.DATE,
      },
      { sequelize, tableName: 'Payment', timestamps: true, paranoid: true }
    )
    return Payment
  }
}
