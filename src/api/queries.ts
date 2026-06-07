// GraphQL query documents. Field names verified against the live schema (BUILD_PLAN.md §5).

export const ITEM_INDEX_QUERY = /* GraphQL */ `
  query ItemIndex {
    items {
      id
      name
      shortName
      normalizedName
      iconLink
      avg24hPrice
      lastLowPrice
      basePrice
      types
    }
  }
`

export const HIDEOUT_REQUIREMENTS_QUERY = /* GraphQL */ `
  query HideoutRequirements {
    hideoutStations {
      id
      name
      normalizedName
      levels {
        level
        itemRequirements {
          item {
            id
            name
          }
          count
        }
      }
    }
  }
`

export const ITEM_DETAIL_QUERY = /* GraphQL */ `
  query ItemDetail($id: ID!) {
    item(id: $id) {
      id
      name
      shortName
      types
      wikiLink
      iconLink
      image512pxLink
      basePrice
      avg24hPrice
      lastLowPrice
      high24hPrice
      changeLast48hPercent
      fleaMarketFee
      properties {
        __typename
        ... on ItemPropertiesKey {
          uses
        }
      }
      sellFor {
        vendor {
          name
          normalizedName
        }
        priceRUB
      }
      usedInTasks {
        id
        name
        wikiLink
        trader {
          name
        }
        minPlayerLevel
        kappaRequired
        objectives {
          __typename
          ... on TaskObjectiveItem {
            item {
              id
              name
            }
            items {
              id
              name
            }
            count
            foundInRaid
          }
        }
      }
    }
  }
`

export const TASKS_QUERY = /* GraphQL */ `
  query Tasks {
    tasks {
      id
      name
      wikiLink
      minPlayerLevel
      kappaRequired
      trader {
        name
      }
      taskRequirements {
        task {
          id
          name
        }
      }
    }
  }
`

export const MAP_MARKERS_QUERY = /* GraphQL */ `
  query MapMarkers {
    maps {
      normalizedName
      name
      extracts {
        name
        faction
        position {
          x
          y
          z
        }
      }
      spawns {
        sides
        categories
        position {
          x
          y
          z
        }
      }
      transits {
        description
        position {
          x
          y
          z
        }
      }
    }
  }
`

export const LOCKS_QUERY = /* GraphQL */ `
  query Locks {
    maps {
      name
      locks {
        lockType
        needsPower
        key {
          id
        }
      }
    }
  }
`

export const AMMO_QUERY = /* GraphQL */ `
  query Ammo {
    ammo {
      item {
        id
        name
        shortName
        iconLink
        avg24hPrice
      }
      caliber
      ammoType
      damage
      armorDamage
      penetrationPower
      fragmentationChance
      projectileCount
      accuracyModifier
      recoilModifier
      initialSpeed
      tracer
    }
  }
`
