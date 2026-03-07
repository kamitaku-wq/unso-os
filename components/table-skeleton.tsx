import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export function TableSkeleton({
  columns,
  rows = 4,
}: {
  columns: number
  rows?: number
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {Array.from({ length: columns }).map((_, index) => (
              <TableHead key={`head-${index}`}>
                <Skeleton className="h-4 w-20" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <TableRow key={`row-${rowIndex}`}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <TableCell key={`cell-${rowIndex}-${colIndex}`}>
                  <Skeleton
                    className={
                      colIndex % 3 === 0 ? "h-4 w-24" : colIndex % 3 === 1 ? "h-4 w-32" : "h-4 w-16"
                    }
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
