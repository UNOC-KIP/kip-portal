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
  declare amount: string  // total incl. VAT — DECIMAL comes back as string from pg
  declare subtotalAmount: CreationOptional<string | null>
  declare vatAmount: CreationOptional<string | null>
  /** Whether the UNOC fee invoice has been emailed to the investor. */
  declare invoiceStatus: CreationOptional<string>
  declare invoiceSentAt: CreationOptional<Date | null>
  declare invoiceSentByUserId: CreationOptional<string | null>
  /** Document row for the finance-attached invoice PDF, if sent via the app. */
  declare invoiceDocumentId: CreationOptional<string | null>
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
        subtotalAmount: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
        vatAmount: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
        invoiceStatus: { type: DataTypes.STRING, allowNull: false, defaultValue: 'NOT_SENT' },
        invoiceSentAt: { type: DataTypes.DATE, allowNull: true },
        invoiceSentByUserId: { type: DataTypes.UUID, allowNull: true },
        invoiceDocumentId: { type: DataTypes.UUID, allowNull: true },
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
