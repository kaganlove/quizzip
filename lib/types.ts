export type Choice = {
  id: string;
  html: string;
};

export type Item = {
  id: string;
  type: string;
  promptHtml: string;
  choices: Choice[];
  correctChoiceIds: string[];
};

export type Assessment = {
  id: string;
  title: string;
  qtiPath: string;
  itemCount: number;
  bankRefCount: number;
  typeCounts: Record<string, number>;
  items?: Item[];
};

export type ParseResult = {
  assessments: Assessment[];
  warnings: string[];
};
