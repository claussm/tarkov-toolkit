import { GraphQLClient } from 'graphql-request'

// Public, CORS-open, no auth required. See BUILD_PLAN.md §5.
export const TARKOV_DEV_ENDPOINT = 'https://api.tarkov.dev/graphql'

export const gqlClient = new GraphQLClient(TARKOV_DEV_ENDPOINT)
