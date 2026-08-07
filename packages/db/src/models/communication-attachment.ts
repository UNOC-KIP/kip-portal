import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  type Sequelize,
} from 'sequelize'

/**
 * A file uploaded once and linked from a broadcast body, rather than mailed to
 * every recipient (see the migration for why). Not tied to a `Communication`:
 * it is uploaded while the message is still being composed, and the same file
 * can be linked from more than one broadcast.
 *
 * `downloadCount` is the only engagement signal available — recipients from the
 * notify list have no account, so there is nobody to attribute a download to.
 */
export class CommunicationAttachment extends Model<
  InferAttributes<CommunicationAttachment>,
  InferCreationAttributes<CommunicationAttachment>
> {
  declare id: CreationOptional<string>
  declare filename: string
  declare storageKey: string
  declare mimeType: string
  declare sizeBytes: number
  declare downloadCount: CreationOptional<number>
  declare uploadedById: CreationOptional<string | null>
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>

  static initModel(sequelize: Sequelize): typeof CommunicationAttachment {
    CommunicationAttachment.init(
      {
        id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        filename: { type: DataTypes.TEXT, allowNull: false },
        storageKey: { type: DataTypes.TEXT, allowNull: false },
        mimeType: { type: DataTypes.TEXT, allowNull: false },
        sizeBytes: { type: DataTypes.INTEGER, allowNull: false },
        downloadCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        uploadedById: { type: DataTypes.UUID, allowNull: true },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      { sequelize, tableName: 'CommunicationAttachment', timestamps: true }
    )
    return CommunicationAttachment
  }
}
