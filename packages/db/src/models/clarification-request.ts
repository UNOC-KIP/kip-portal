import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  type Sequelize,
} from 'sequelize'

export class ClarificationRequest extends Model<
  InferAttributes<ClarificationRequest>,
  InferCreationAttributes<ClarificationRequest>
> {
  declare id: CreationOptional<string>
  declare applicationId: string
  declare requestedById: string
  /** Which committee asked: `TC` or `LAC`. The investor's reply returns the application to it. */
  declare committee: CreationOptional<string>
  declare notes: string
  declare response: CreationOptional<string | null>
  declare respondedAt: CreationOptional<Date | null>
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>

  static initModel(sequelize: Sequelize): typeof ClarificationRequest {
    ClarificationRequest.init(
      {
        id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        applicationId: { type: DataTypes.UUID, allowNull: false },
        requestedById: { type: DataTypes.UUID, allowNull: false },
        committee: { type: DataTypes.STRING, allowNull: false, defaultValue: 'TC' },
        notes: { type: DataTypes.TEXT, allowNull: false },
        response: { type: DataTypes.TEXT, allowNull: true },
        respondedAt: { type: DataTypes.DATE, allowNull: true },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      { sequelize, tableName: 'ClarificationRequest', timestamps: true }
    )
    return ClarificationRequest
  }
}
