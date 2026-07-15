import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  type Sequelize,
} from 'sequelize'

/**
 * One stage of the public application timeline, managed by ADMIN under
 * /console/settings. `position` orders the list; `kind` marks the rows that
 * also gate behaviour (SITE_VISIT → booking cut-off, EOI_CALL → countdown +
 * call window labels); `status` is AUTO (derived from dates) or a manual
 * UPCOMING/CURRENT/COMPLETED override. Pure helpers live in @kip/shared.
 */
export class TimelineMilestone extends Model<
  InferAttributes<TimelineMilestone>,
  InferCreationAttributes<TimelineMilestone>
> {
  declare id: CreationOptional<string>
  declare position: number
  declare kind: CreationOptional<string>
  declare title: string
  declare dateLabel: string
  declare startsAt: Date
  declare endsAt: CreationOptional<Date | null>
  declare status: CreationOptional<string>
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>

  static initModel(sequelize: Sequelize): typeof TimelineMilestone {
    TimelineMilestone.init(
      {
        id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        position: { type: DataTypes.INTEGER, allowNull: false, unique: true },
        kind: { type: DataTypes.STRING, allowNull: false, defaultValue: 'GENERIC' },
        title: { type: DataTypes.TEXT, allowNull: false },
        dateLabel: { type: DataTypes.TEXT, allowNull: false },
        startsAt: { type: DataTypes.DATE, allowNull: false },
        endsAt: { type: DataTypes.DATE, allowNull: true },
        status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'AUTO' },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      {
        sequelize,
        tableName: 'TimelineMilestone',
      },
    )
    return TimelineMilestone
  }
}
