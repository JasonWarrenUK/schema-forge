export const simpleCsv = `name,age
Alice,30
Bob,25`;

export const csvWithQuotedCommas = `name,address
Alice,"14 Forty Lane, Wembley Park"
Bob,"123 Main St, London"`;

export const csvWithEscapedQuotes = `name,note
Alice,"She said ""hello"""`;

export const csvWithWhitespaceHeaders = `name , age ,  city
Alice,30,London`;

export const csvWithBom = `\ufeffname,age
Alice,30`;

export const csvWithEmptyLines = `name,age
Alice,30

Bob,25

`;

export const csvWithEmptyFields = `name,age,city
Alice,,London
,25,`;
