import { z } from 'zod';
import {
  componentNames,
  type StoryGroup,
  type StoryNode,
  type Values,
} from '@desys/stories.js';

// Composants du laboratoire : construits dans desys studio, avec le chat, en
// assemblant les composants de desys (Card, ListRow, Badge, Button…). Un
// composant est une donnée (desys/components/lab/<id>.json), jamais du code :
// ses propriétés, ses variantes (presets) et un gabarit de nœuds où `{Nom}`
// reprend la valeur d'une propriété.
const slug = z
  .string()
  .regex(/^[a-z][a-z0-9-]{1,40}$/, 'identifiant en minuscules et tirets');
type NodeIn = {
  type: (typeof componentNames)[number];
  props?: Record<string, string | number | boolean | NodeIn>;
  children?: (NodeIn | string)[];
};
export const labNodeSchema: z.ZodType<NodeIn> = z.lazy(() =>
  z
    .object({
      type: z.enum(componentNames),
      props: z
        .record(
          z.string().regex(/^[a-zA-Z]{1,30}$/),
          z.union([
            z.string().max(200),
            z.number(),
            z.boolean(),
            labNodeSchema,
          ]),
        )
        .optional(),
      children: z
        .array(z.union([labNodeSchema, z.string().max(200)]))
        .max(12)
        .optional(),
    })
    .strict(),
);
const propSchema = z.discriminatedUnion('type', [
  z
    .object({
      name: z.string().min(1).max(30),
      type: z.literal('variant'),
      options: z.array(z.string().min(1).max(40)).min(2).max(6),
    })
    .strict(),
  z
    .object({ name: z.string().min(1).max(30), type: z.literal('text') })
    .strict(),
  z
    .object({ name: z.string().min(1).max(30), type: z.literal('boolean') })
    .strict(),
]);
export const labSpecSchema = z
  .object({
    id: slug,
    name: z.string().min(1).max(60),
    description: z.string().max(300),
    props: z.array(propSchema).max(8),
    presets: z
      .array(
        z
          .object({
            id: slug,
            name: z.string().min(1).max(40),
            values: z.record(
              z.string(),
              z.union([z.string().max(120), z.boolean()]),
            ),
          })
          .strict(),
      )
      .min(1)
      .max(6),
    template: labNodeSchema,
  })
  .strict()
  .superRefine((spec, ctx) => {
    let count = 0;
    const walk = (n: NodeIn, depth: number) => {
      count++;
      if (depth > 6)
        ctx.addIssue({
          code: 'custom',
          message: 'gabarit trop profond (6 niveaux)',
        });
      for (const v of Object.values(n.props ?? {}))
        if (typeof v === 'object') walk(v, depth + 1);
      for (const c of n.children ?? [])
        if (typeof c === 'object') walk(c, depth + 1);
    };
    walk(spec.template, 1);
    if (count > 60)
      ctx.addIssue({
        code: 'custom',
        message: 'gabarit trop grand (60 nœuds)',
      });
    const ids = spec.presets.map((p) => p.id);
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({
        code: 'custom',
        message: 'deux variantes ont le même id',
      });
  });
export type LabSpec = z.infer<typeof labSpecSchema>;

// `{Nom}` dans un texte → valeur de la propriété ; une valeur exactement `{Nom}`
// garde son type (booléen d'un interrupteur, par exemple).
function fill(node: NodeIn, values: Values): StoryNode {
  const text = (s: string): string | boolean => {
    const whole = /^\{([^{}]+)\}$/.exec(s);
    if (whole && whole[1] in values) return values[whole[1]];
    return s.replace(/\{([^{}]+)\}/g, (m, k: string) =>
      k in values ? String(values[k]) : m,
    );
  };
  return {
    type: node.type,
    props: node.props
      ? Object.fromEntries(
          Object.entries(node.props).map(([k, v]) => [
            k,
            typeof v === 'string'
              ? text(v)
              : typeof v === 'object'
                ? fill(v, values)
                : v,
          ]),
        )
      : undefined,
    children: node.children?.map((c) =>
      typeof c === 'string' ? String(text(c)) : fill(c, values),
    ),
  };
}

export function labGroup(spec: LabSpec): StoryGroup & { lab: true } {
  const defaults = Object.fromEntries(
    spec.props.map((p) => [
      p.name,
      p.type === 'variant' ? p.options[0] : p.type === 'boolean' ? false : '',
    ]),
  ) as Values;
  const build = (v: Values) => fill(spec.template, { ...defaults, ...v });
  return {
    lab: true,
    id: spec.id,
    name: spec.name,
    props: spec.props,
    build,
    figma: () => undefined,
    stories: spec.presets.map((p) => ({
      id: p.id,
      name: p.name,
      values: { ...defaults, ...p.values },
      node: build(p.values),
    })),
  };
}

// Page de doc créée avec le composant : brouillon, à compléter dans l'éditeur.
export function labDoc(spec: LabSpec) {
  const used = new Set<string>();
  const walk = (n: NodeIn) => {
    used.add(n.type);
    Object.values(n.props ?? {}).forEach(
      (v) => typeof v === 'object' && walk(v),
    );
    (n.children ?? []).forEach((c) => typeof c === 'object' && walk(c));
  };
  walk(spec.template);
  return {
    slug: spec.id,
    title: spec.name,
    section: 'composants' as const,
    order: 100,
    summary: spec.description,
    status: 'brouillon' as const,
    figma: [],
    body: `## Usage\n\n${spec.description || 'À quoi sert ce composant.'}\n\n{{composant:${spec.id}}}\n\n## Anatomie\n\nComposé des composants desys : ${[...used].map((t) => `\`${t}\``).join(', ')}.\n\n:::note Créé dans le laboratoire\nComposant assemblé dans desys studio avec le chat. À compléter : quand l’utiliser, quand l’éviter.\n:::\n`,
  };
}
