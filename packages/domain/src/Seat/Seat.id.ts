import * as Schema from "effect/Schema";

export const SeatId = Schema.String.pipe(Schema.brand("SeatId"));
export type SeatId = typeof SeatId.Type;

export const seatIdOf = (assayId: string, seat: string): SeatId => SeatId.make(`${assayId}/${seat}`);
