import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  type Sequelize,
} from 'sequelize'

/**
 * A KIP land parcel, mirrored from the UNOC GIS "KIP Phase 2" feature service
 * (server/rest/services/Hosted/KIP_Phase_2/FeatureServer/0) by the plot sync
 * job. The GIS is the source of truth for the map and the allocation register;
 * this table is a local, queryable copy so investors can browse and select a
 * plot without the portal depending on the GIS being reachable at request time.
 *
 * `gisObjectId` (the GIS `fid`) is the stable key the sync upserts on.
 * `available` is derived at sync time from the GIS `status` ("Not taken").
 */
export class Plot extends Model<
  InferAttributes<Plot>,
  InferCreationAttributes<Plot>
> {
  declare id: CreationOptional<string>
  declare gisObjectId: number
  declare plotName: string
  declare zone: CreationOptional<string | null>
  declare acreage: CreationOptional<number | null>
  declare areaCategory: CreationOptional<string | null>
  declare lot: CreationOptional<string | null>
  declare usage: CreationOptional<string | null>
  /** Raw GIS status string: " " | "Not taken" | "Taken". */
  declare gisStatus: CreationOptional<string | null>
  /** GIS-side allocated investor, if any (distinct from a portal allocation). */
  declare gisInvestor: CreationOptional<string | null>
  /** Derived: true when the plot is free to apply for. */
  declare available: CreationOptional<boolean>
  declare lastSyncedAt: CreationOptional<Date | null>
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>

  static initModel(sequelize: Sequelize): typeof Plot {
    Plot.init(
      {
        id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        gisObjectId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
        plotName: { type: DataTypes.STRING, allowNull: false },
        zone: { type: DataTypes.STRING, allowNull: true },
        acreage: { type: DataTypes.DOUBLE, allowNull: true },
        areaCategory: { type: DataTypes.STRING, allowNull: true },
        lot: { type: DataTypes.STRING, allowNull: true },
        usage: { type: DataTypes.STRING, allowNull: true },
        gisStatus: { type: DataTypes.STRING, allowNull: true },
        gisInvestor: { type: DataTypes.STRING, allowNull: true },
        available: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        lastSyncedAt: { type: DataTypes.DATE, allowNull: true },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      { sequelize, tableName: 'Plot', timestamps: true }
    )
    return Plot
  }
}
