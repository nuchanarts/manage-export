import { getEclaimCategory, listEclaimCategories } from '../../services/eclaimRegistry'
import { makeConfigRouter } from './configRouterFactory'

export default makeConfigRouter({ get: getEclaimCategory, list: listEclaimCategories })
