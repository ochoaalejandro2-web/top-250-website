function ProductForm({ product, onSaved }: { product: Product; onSaved: () => Promise<void> }) {
  const [p, setP] = useState(product);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await saveProduct({
        data: {
          id: p.id,
          name: p.name,
          fullName: p.fullName,
          tag: p.tag,
          description: p.description,
          priceCents: p.priceCents,
          weightLb: p.weightLb,
          imageUrl: p.imageUrl,
          stock: p.stock,
          active: p.active,
        },
      });
      toast.success("Product saved");
      await onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1_500_000) {
      toast.error("Image is too large. Please use a picture under 1.5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setP({ ...p, imageUrl: reader.result as string });
      toast.success("Image loaded");
    };
    reader.readAsDataURL(file);
  }

  return (
    <form className="space-y-3 rounded-2xl border border-border bg-card p-4" onSubmit={save}>
      <div className="space-y-1">
        <Label>Id (slug)</Label>
        <Input value={p.id} onChange={(e) => setP({ ...p, id: e.target.value })} required />
      </div>
      <div className="space-y-1">
        <Label>Name</Label>
        <Input value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} required />
      </div>
      <div className="space-y-1">
        <Label>Full name</Label>
        <Input value={p.fullName} onChange={(e) => setP({ ...p, fullName: e.target.value })} required />
      </div>
      <div className="space-y-1">
        <Label>Tag</Label>
        <Input value={p.tag} onChange={(e) => setP({ ...p, tag: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label>Description</Label>
        <Textarea value={p.description} onChange={(e) => setP({ ...p, description: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Price (cents)</Label>
          <Input
            type="number"
            value={p.priceCents}
            onChange={(e) => setP({ ...p, priceCents: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-1">
          <Label>Stock</Label>
          <Input type="number" value={p.stock} onChange={(e) => setP({ ...p, stock: Number(e.target.value) })} />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Weight (lb)</Label>
        <Input
          type="number"
          step="0.01"
          value={p.weightLb}
          onChange={(e) => setP({ ...p, weightLb: Number(e.target.value) })}
        />
      </div>

      {/* Image Upload Section */}
      <div className="space-y-2">
        <Label>Product Image</Label>
        {p.imageUrl && (
          <img
            src={p.imageUrl}
            alt="Preview"
            className="h-32 w-full rounded-lg object-cover border border-border"
          />
        )}
        <Input type="file" accept="image/*" onChange={handleImageUpload} />
        <p className="text-xs text-muted-foreground">
          Or paste an image URL below
        </p>
        <Input
          value={p.imageUrl.startsWith("data:") ? "" : p.imageUrl}
          onChange={(e) => setP({ ...p, imageUrl: e.target.value })}
          placeholder="https://..."
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={p.active} onChange={(e) => setP({ ...p, active: e.target.checked })} />
        Visible in shop
      </label>
      <Button type="submit" disabled={busy}>
        Save product
      </Button>
    </form>
  );
}