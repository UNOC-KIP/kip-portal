import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  type Sequelize,
} from 'sequelize'

export class ApplicationWindow extends Model<
  InferAttributes<ApplicationWindow>,
  InferCreationAttributes<ApplicationWindow>
> {
  declare id: CreationOptional<string>
  declare name: string
  declare openAt: Date
  declare closeAt: Date
  declare status: CreationOptional<string>
  declare sequenceCounter: CreationOptional<number>
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
  declare deletedAt: CreationOptional<Date | null>

  static initModel(sequelize: Sequelize): typeof ApplicationWindow {
    ApplicationWindow.init(
      {
        id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        name: { type: DataTypes.STRING, allowNull: false },
        openAt: { type: DataTypes.DATE, allowNull: false },
        closeAt: { type: DataTypes.DATE, allowNull: false },
        status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'DRAFT' },
        sequenceCounter: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
        deletedAt: DataTypes.DATE,
      },
      { sequelize, tableName: 'ApplicationWindow', timestamps: true, paranoid: true }
    )
    return ApplicationWindow
  }
}
