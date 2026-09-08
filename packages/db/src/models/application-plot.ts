import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  type Sequelize,
} from 'sequelize'

/**
 * Join row: a plot an application is applying for. An application may select
 * several plots; the total acreage across them auto-fills the required land
 * area (spec §2.1). Unique per (application, plot).
 */
export class ApplicationPlot extends Model<
  InferAttributes<ApplicationPlot>,
  InferCreationAttributes<ApplicationPlot>
> {
  declare id: CreationOptional<string>
  declare applicationId: string
  declare plotId: string
  /** Snapshot of the plot's road/street at selection time, for faster review. */
  declare road: CreationOptional<string | null>
  declare createdAt: CreationOptional<Date>

  static initModel(sequelize: Sequelize): typeof ApplicationPlot {
    ApplicationPlot.init(
      {
        id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        applicationId: { type: DataTypes.UUID, allowNull: false },
        plotId: { type: DataTypes.UUID, allowNull: false },
        road: { type: DataTypes.STRING, allowNull: true },
        createdAt: DataTypes.DATE,
      },
      { sequelize, tableName: 'ApplicationPlot', createdAt: 'createdAt', updatedAt: false }
    )
    return ApplicationPlot
  }
}
