import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  type Sequelize,
} from 'sequelize'

export class Document extends Model<
  InferAttributes<Document>,
  InferCreationAttributes<Document>
> {
  declare id: CreationOptional<string>
  declare applicationId: string
  declare partnerId: CreationOptional<string | null>
  declare kind: string
  declare filename: string
  declare storageKey: string
  declare mimeType: string
  declare sizeBytes: number
  declare uploadedAt: CreationOptional<Date>

  static initModel(sequelize: Sequelize): typeof Document {
    Document.init(
      {
        id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        applicationId: { type: DataTypes.UUID, allowNull: false },
        partnerId: { type: DataTypes.UUID, allowNull: true },
        kind: { type: DataTypes.STRING, allowNull: false },
        filename: { type: DataTypes.STRING, allowNull: false },
        storageKey: { type: DataTypes.STRING, allowNull: false },
        mimeType: { type: DataTypes.STRING, allowNull: false },
        sizeBytes: { type: DataTypes.INTEGER, allowNull: false },
        uploadedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      },
      { sequelize, tableName: 'Document', timestamps: false }
    )
    return Document
  }
}
