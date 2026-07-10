import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  type Sequelize,
} from 'sequelize'

/**
 * An investor's request to visit the Kabalega Industrial Park site before the
 * EOI window opens. Captures the zone and land use they are interested in, a
 * brief description of the intended activity, and the acreage they need.
 *
 * The secretariat responds out of band with dates and a formal invitation;
 * `status` / `scheduledAt` track that follow-up from the admin console.
 */
export class SiteVisitBooking extends Model<
  InferAttributes<SiteVisitBooking>,
  InferCreationAttributes<SiteVisitBooking>
> {
  declare id: CreationOptional<string>
  declare userId: string
  declare investorOrgId: CreationOptional<string | null>
  /** A `KipZone` value — stored as text so adding a zone needs no migration. */
  declare zone: string
  /** Must be one of `landUsesForZone(zone)` — enforced in the API schema. */
  declare landUse: string
  declare description: string
  declare acres: number
  declare status: CreationOptional<string>
  declare scheduledAt: CreationOptional<Date | null>
  declare handledById: CreationOptional<string | null>
  declare handledAt: CreationOptional<Date | null>
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>

  static initModel(sequelize: Sequelize): typeof SiteVisitBooking {
    SiteVisitBooking.init(
      {
        id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        userId: { type: DataTypes.UUID, allowNull: false },
        investorOrgId: { type: DataTypes.UUID, allowNull: true },
        zone: { type: DataTypes.STRING, allowNull: false },
        landUse: { type: DataTypes.STRING, allowNull: false },
        description: { type: DataTypes.TEXT, allowNull: false },
        acres: { type: DataTypes.INTEGER, allowNull: false },
        status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'NEW' },
        scheduledAt: { type: DataTypes.DATE, allowNull: true },
        handledById: { type: DataTypes.UUID, allowNull: true },
        handledAt: { type: DataTypes.DATE, allowNull: true },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      { sequelize, tableName: 'SiteVisitBooking', timestamps: true }
    )
    return SiteVisitBooking
  }
}
