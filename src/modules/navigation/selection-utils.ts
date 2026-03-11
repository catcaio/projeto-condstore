type SelectionPredicate<TItem> = (item: TItem) => boolean;

export function resolvePreferredItem<TItem>({
    items,
    allItems = items,
    explicitId,
    getId,
    preferredPredicates = [],
}: {
    items: TItem[];
    allItems?: TItem[];
    explicitId?: string;
    getId: (item: TItem) => string;
    preferredPredicates?: SelectionPredicate<TItem>[];
}) {
    if (explicitId) {
        const itemById = items.find((item) => getId(item) === explicitId) ?? allItems.find((item) => getId(item) === explicitId);
        if (itemById) {
            return itemById;
        }
    }

    for (const predicate of preferredPredicates) {
        const matched = items.find(predicate) ?? allItems.find(predicate);
        if (matched) {
            return matched;
        }
    }

    return items[0] ?? allItems[0];
}
