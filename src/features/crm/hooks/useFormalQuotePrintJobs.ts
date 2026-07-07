// Hook para gestionar trabajos de impresión de una cotización formal.
// USO INTERNO DEL CRM.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  assignItemToPrintJob,
  createAdditionalCharge,
  createPrintJob,
  createPrintJobComponent,
  deletePrintJob,
  deletePrintJobComponent,
  listPrintJobComponents,
  listPrintJobItems,
  listPrintJobs,
  removeItemFromPrintJob,
  updatePrintJob,
  updatePrintJobComponent,
  updatePrintJobItem,
  type FormalQuotePrintJob,
  type FormalQuotePrintJobComponent,
  type FormalQuotePrintJobComponentInsert,
  type FormalQuotePrintJobComponentUpdate,
  type FormalQuotePrintJobInsert,
  type FormalQuotePrintJobItem,
  type FormalQuotePrintJobItemInsert,
  type FormalQuotePrintJobItemUpdate,
  type FormalQuotePrintJobUpdate,
} from "@/features/crm/lib/formal-quote-print-jobs";

export function useFormalQuotePrintJobs(formalQuoteId: string | undefined) {
  const qc = useQueryClient();
  const enabled = !!formalQuoteId;

  const jobs = useQuery({
    queryKey: ["formal_quote_print_jobs", formalQuoteId],
    enabled,
    queryFn: (): Promise<FormalQuotePrintJob[]> => listPrintJobs(formalQuoteId!),
  });

  const items = useQuery({
    queryKey: ["formal_quote_print_job_items", formalQuoteId],
    enabled,
    queryFn: (): Promise<FormalQuotePrintJobItem[]> =>
      listPrintJobItems(formalQuoteId!),
  });

  const components = useQuery({
    queryKey: ["formal_quote_print_job_components", formalQuoteId],
    enabled,
    queryFn: (): Promise<FormalQuotePrintJobComponent[]> =>
      listPrintJobComponents(formalQuoteId!),
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["formal_quote_print_jobs", formalQuoteId] });
    qc.invalidateQueries({
      queryKey: ["formal_quote_print_job_items", formalQuoteId],
    });
    qc.invalidateQueries({
      queryKey: ["formal_quote_print_job_components", formalQuoteId],
    });
  };

  const createJob = useMutation({
    mutationFn: (values: Partial<FormalQuotePrintJobInsert> = {}) => {
      if (!formalQuoteId) throw new Error("Falta formalQuoteId");
      return createPrintJob(formalQuoteId, values);
    },
    onSuccess: invalidateAll,
  });

  const updateJob = useMutation({
    mutationFn: ({ id, values }: { id: string; values: FormalQuotePrintJobUpdate }) =>
      updatePrintJob(id, values),
    onSuccess: invalidateAll,
  });

  const deleteJob = useMutation({
    mutationFn: (id: string) => deletePrintJob(id),
    onSuccess: invalidateAll,
  });

  const assignItem = useMutation({
    mutationFn: (values: FormalQuotePrintJobItemInsert) =>
      assignItemToPrintJob(values),
    onSuccess: invalidateAll,
  });

  const removeItem = useMutation({
    mutationFn: (id: string) => removeItemFromPrintJob(id),
    onSuccess: invalidateAll,
  });

  const updateItem = useMutation({
    mutationFn: ({ id, values }: { id: string; values: FormalQuotePrintJobItemUpdate }) =>
      updatePrintJobItem(id, values),
    onSuccess: invalidateAll,
  });

  const createComponent = useMutation({
    mutationFn: (values: FormalQuotePrintJobComponentInsert) =>
      createPrintJobComponent(values),
    onSuccess: invalidateAll,
  });

  const updateComponent = useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: FormalQuotePrintJobComponentUpdate;
    }) => updatePrintJobComponent(id, values),
    onSuccess: invalidateAll,
  });

  const deleteComponent = useMutation({
    mutationFn: (id: string) => deletePrintJobComponent(id),
    onSuccess: invalidateAll,
  });

  const addCharge = useMutation({
    mutationFn: ({
      printJobId,
      input,
    }: {
      printJobId: string;
      input: {
        label: string;
        description: string;
        amount_mxn: number;
        sort_order?: number;
        include_in_customer_price?: boolean;
      };
    }) => createAdditionalCharge(printJobId, input),
    onSuccess: invalidateAll,
  });

  const updateCharge = updateComponent;
  const deleteCharge = deleteComponent;

  return {
    jobs,
    items,
    components,
    createJob,
    updateJob,
    deleteJob,
    assignItem,
    removeItem,
    createComponent,
    updateComponent,
    deleteComponent,
    addCharge,
    updateCharge,
    deleteCharge,
    invalidateAll,
  };
}

export type UseFormalQuotePrintJobsReturn = ReturnType<
  typeof useFormalQuotePrintJobs
>;
