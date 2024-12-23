import {
  ConditionalFilter,
  CrudFilter,
  CrudFilters,
  CrudOperators,
  HttpError,
} from "@refinedev/core";
import { ClientResponseError } from "pocketbase";

const OPERATOR_MAP = {
  eq: "=",
  ne: "!=",
  lt: "<",
  gt: ">",
  lte: "<=",
  gte: ">=",
  in: "?=",
  nin: "?!=",
  ina: undefined,
  nina: undefined,
  contains: "~",
  ncontains: "!~",
  containss: "~",
  ncontainss: "!~",
  between: undefined,
  nbetween: undefined,
  null: "=",
  nnull: "!=",
  startswith: "~",
  nstartswith: "!~",
  startswiths: "~",
  nstartswiths: "!~",
  endswith: "~",
  nendswith: "!~",
  endswiths: "~",
  nendswiths: "!~",
  or: "||",
  and: "&&",
};

const crudOperator = (op: Exclude<CrudOperators, "or" | "and">) => {
  if (!OPERATOR_MAP[op]) {
    throw Error(`operator "${op}" is not supported by refine-pocketbase`);
  }

  return OPERATOR_MAP[op];
};

export const isClientResponseError = (x: any): x is ClientResponseError =>
  typeof x.response === "object" &&
  typeof x.isAbort === "boolean" &&
  typeof x.url === "string" &&
  typeof x.status === "number";

export const toHttpError = (e: ClientResponseError): HttpError => ({
  message: e.message,
  statusCode: e.status,
  errors: Object.keys(e.response.data).reduce(
    (acc, next) => ({
      ...acc,
      [next]: (e as ClientResponseError).response.data[next].message,
    }),
    {}
  ),
});

const isConditionalFilter = (filter: CrudFilter): filter is ConditionalFilter =>
  filter.operator === "and" || filter.operator === "or";

export const extractFilterExpression = (
  filters: CrudFilters,
  joinOperator: ConditionalFilter["operator"] = "and",
  pos = 0
) =>
  filters
    .map((filter, i): string =>
      isConditionalFilter(filter)
        ? `(${extractFilterExpression(filter.value, filter.operator, i)})`
        : `${filter.field} ${crudOperator(filter.operator)} {:${
            filter.field
          }${pos}${i}}`
    )
    .join(` ${OPERATOR_MAP[joinOperator]} `);

export const extractFilterValues = (
  filters: CrudFilters,
  pos = 0
): Record<string, unknown> =>
  filters.reduce(
    (acc, filter, i) => ({
      ...acc,
      ...(isConditionalFilter(filter)
        ? extractFilterValues(filter.value, i)
        : { [filter.field + pos + i]: filter.value }),
    }),
    {}
  );
