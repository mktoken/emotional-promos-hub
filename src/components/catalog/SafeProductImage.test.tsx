import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import SafeProductImage from "./SafeProductImage";

describe("SafeProductImage", () => {
  it("renders the primary URL normally", () => {
    render(<SafeProductImage images={["https://cdn.test/primary.webp"]} alt="Producto demo" />);

    expect(screen.getByRole("img", { name: "Producto demo" })).toHaveAttribute(
      "src",
      "https://cdn.test/primary.webp",
    );
  });

  it("uses the next candidate when the primary URL fails", () => {
    render(
      <SafeProductImage
        images={["https://cdn.test/primary.webp", "https://cdn.test/secondary.webp"]}
        alt="Producto demo"
      />,
    );

    fireEvent.error(screen.getByRole("img", { name: "Producto demo" }));

    expect(screen.getByRole("img", { name: "Producto demo" })).toHaveAttribute(
      "src",
      "https://cdn.test/secondary.webp",
    );
    expect(screen.queryByText("Imagen en actualización")).not.toBeInTheDocument();
  });

  it("shows the deliberate final state only after every candidate fails", () => {
    render(
      <SafeProductImage
        images={["https://cdn.test/primary.webp", "https://cdn.test/secondary.webp"]}
        alt="Producto demo"
      />,
    );

    const image = screen.getByRole("img", { name: "Producto demo" });
    fireEvent.error(image);
    fireEvent.error(screen.getByRole("img", { name: "Producto demo" }));

    expect(screen.getByText("Imagen en actualización")).toBeInTheDocument();
    expect(screen.getByText("Consulta disponibilidad")).toBeInTheDocument();
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
  });

  it("uses the same deliberate state when there is no URL", () => {
    render(<SafeProductImage images={["", "   "]} alt="Producto demo" />);

    expect(screen.getByText("Imagen en actualización")).toBeInTheDocument();
    expect(screen.getByText("Consulta disponibilidad")).toBeInTheDocument();
  });

  it("does not alter product metadata while the image degrades", () => {
    const onVariantChange = vi.fn();

    render(
      <div>
        <SafeProductImage images={["https://cdn.test/broken.webp"]} alt="Vaso demo" />
        <h2>Vaso demo</h2>
        <p>$100.00 MXN</p>
        <p>Disponible</p>
        <p>Mínimo 10 piezas</p>
        <label>
          Variante
          <select defaultValue="azul" onChange={(event) => onVariantChange(event.target.value)}>
            <option value="azul">Azul</option>
          </select>
        </label>
      </div>,
    );

    fireEvent.error(screen.getByRole("img", { name: "Vaso demo" }));

    expect(screen.getByRole("heading", { name: "Vaso demo" })).toBeInTheDocument();
    expect(screen.getByText("$100.00 MXN")).toBeInTheDocument();
    expect(screen.getByText("Disponible")).toBeInTheDocument();
    expect(screen.getByText("Mínimo 10 piezas")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveValue("azul");
    expect(onVariantChange).not.toHaveBeenCalled();
  });
});
