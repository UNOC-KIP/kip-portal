import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  type Sequelize,
} from 'sequelize'

export class ReviewAction extends Model<
  InferAttributes<ReviewAction>,
  InferCreationAttributes<ReviewAction>
> {
  declare id: CreationOptional<string>
  declare applicationId: string
  declare actorUserId: string
  declare type: string
  declare fromStatus: CreationOptional<string | null>
  declare toStatus: CreationOptional<string | null>
  declare notes: CreationOptional<string | null>
  declare createdAt: CreationOptional<Date>

  static initModel(sequelize: Sequelize): typeof ReviewAction {
    ReviewAction.init(
      {
        id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        applicationId: { type: DataTypes.UUID, allowNull: false },
        actorUserId: { type: DataTypes.UUID, allowNull: false },
        type: { type: DataTypes.STRING, allowNull: false },
        fromStatus: { type: DataTypes.STRING, allowNull: true },
        toStatus: { type: DataTypes.STRING, allowNull: true },
        notes: { type: DataTypes.TEXT, allowNull: true },
        createdAt: DataTypes.DATE,
      },
      {
        sequelize,
        tableName: 'ReviewAction',
        createdAt: 'createdAt',
        updatedAt: false,
      }
    )
    return ReviewAction
  }
}
