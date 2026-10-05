import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  type Sequelize,
} from 'sequelize'

/**
 * One Land Allocation Committee member's recommendation on one application.
 *
 * Unique per (application, reviewer): a member revises their own row until the
 * committee records its single final decision, which is a `ReviewAction` that
 * moves the application's status. These rows never move a status themselves.
 */
export class LacReview extends Model<
  InferAttributes<LacReview>,
  InferCreationAttributes<LacReview>
> {
  declare id: CreationOptional<string>
  declare applicationId: string
  declare reviewerId: string
  /** A `LacRecommendation` value — APPROVE | REJECT | MORE_INFO. */
  declare recommendation: string
  declare notes: string
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>

  static initModel(sequelize: Sequelize): typeof LacReview {
    LacReview.init(
      {
        id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        applicationId: { type: DataTypes.UUID, allowNull: false },
        reviewerId: { type: DataTypes.UUID, allowNull: false },
        recommendation: { type: DataTypes.STRING, allowNull: false },
        notes: { type: DataTypes.TEXT, allowNull: false },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      { sequelize, tableName: 'LacReview', timestamps: true }
    )
    return LacReview
  }
}
