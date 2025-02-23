// src/types/intent.ts
export type Intent =
    | 'status' // order related
    | 'tracking' // order related
    | 'return' // order related
    | 'cancel' // order related
    | 'refund' // order related
    // | 'product'           // product related
    // | 'payment'           // payment related
    // | 'shipping'          // shipping related
    // | 'return'            // return related
    // | 'cancel'            // cancel related
    | 'other'             // other related
    | 'ticketing'

export type OrderIntent =
    | 'status'
    | 'tracking'
    | 'return'
    | 'cancel'
    | 'other'
