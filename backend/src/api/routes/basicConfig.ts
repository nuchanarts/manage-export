import { getCategory, listCategories } from '../../services/categoryRegistry'
import { makeConfigRouter } from './configRouterFactory'

export default makeConfigRouter({ get: getCategory, list: listCategories }, 'basic')
