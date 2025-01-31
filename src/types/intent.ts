// src/types/intent.ts
export type Intent =
    | 'order'             // order related
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
