"use client"

import { useState, useEffect } from "react"
import { Download, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

type Record = {
  barber: string
  time: string
  service: string
  price: string
}

export default function BarberShopSystem() {
  const [selectedBarber, setSelectedBarber] = useState("")
  const [selectedService, setSelectedService] = useState("")
  const [price, setPrice] = useState("")
  const [records, setRecords] = useState<Record[]>([])
  const [filterBarber, setFilterBarber] = useState("all")

  // Load records from localStorage on initial render
  useEffect(() => {
    const savedRecords = localStorage.getItem("barberShopRecords")
    if (savedRecords) {
      try {
        setRecords(JSON.parse(savedRecords))
      } catch (error) {
        console.error("Error parsing saved records:", error)
      }
    }
  }, [])

  // Save records to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("barberShopRecords", JSON.stringify(records))
  }, [records])

  // Add this service price mapping
  const servicePrices = {
    "Saç Kesimi": ["250", "300", "350"],
    Tıraş: ["150", "200", "250"],
    "Sakal Tıraşı": ["100", "150", "200"],
    "Saç Boyama": ["450", "550", "650"],
  }

  const handleSave = () => {
    if (!selectedBarber || !selectedService || !price) {
      toast({
        title: "Hata",
        description: "Lütfen tüm alanları doldurun.",
        variant: "destructive",
      })
      return
    }

    const now = new Date()
    const hours = now.getHours().toString().padStart(2, "0")
    const minutes = now.getMinutes().toString().padStart(2, "0")
    const timeString = `${hours}:${minutes}`

    setRecords([
      ...records,
      {
        barber: selectedBarber,
        time: timeString,
        service: selectedService,
        price: price,
      },
    ])

    toast({
      title: "Başarılı",
      description: "Hizmet kaydı başarıyla eklendi.",
    })

    // Reset form
    setSelectedBarber("")
    setSelectedService("")
    setPrice("")
  }

  const generatePDF = () => {
    if (records.length === 0) {
      toast({
        title: "Uyarı",
        description: "İndirilecek kayıt bulunmamaktadır.",
        variant: "destructive",
      })
      return
    }

    try {
      // Create a new PDF document with UTF-8 encoding for Turkish characters
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      })

      // Add current date
      const today = new Date()
      const dateStr = today.toLocaleDateString("tr-TR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })

      // Add title and date
      doc.setFontSize(22)
      doc.setTextColor(153, 0, 0) // #990000
      doc.text("ODTU Berber - Gelir Raporu", 105, 20, { align: "center" })

      doc.setFontSize(12)
      doc.setTextColor(0, 0, 0)
      doc.text(`Tarih: ${dateStr}`, 105, 30, { align: "center" })

      // Filter records if a specific barber is selected
      const filteredRecords =
        filterBarber === "all" ? records : records.filter((record) => record.barber === filterBarber)

      // Calculate total
      const total = filteredRecords.reduce((sum, record) => sum + Number.parseFloat(record.price), 0).toFixed(2)

      // Prepare table data with proper Turkish character encoding
      const tableData = filteredRecords.map((record) => [
        record.barber,
        record.time,
        // Replace Turkish characters with their ASCII equivalents for better compatibility
        record.service
          .replace(/ı/g, "i")
          .replace(/ğ/g, "g")
          .replace(/ü/g, "u")
          .replace(/ş/g, "s")
          .replace(/ö/g, "o")
          .replace(/ç/g, "c")
          .replace(/İ/g, "I"),
        `${record.price} TL`,
      ])

      // Add table to PDF with improved styling
      autoTable(doc, {
        head: [["Berber", "Saat", "Hizmet", "Fiyat"]],
        body: tableData,
        startY: 40,
        theme: "grid",
        headStyles: {
          fillColor: [153, 0, 0],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          halign: "center",
          valign: "middle",
          fontSize: 12,
          cellPadding: 4,
        },
        bodyStyles: {
          fontSize: 11,
          cellPadding: 4,
        },
        columnStyles: {
          0: { halign: "left" },
          1: { halign: "center" },
          2: { halign: "left" },
          3: { halign: "right" },
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        margin: { top: 40, left: 15, right: 15 },
        tableWidth: "auto",
      })

      // Add total row with improved styling - fixed to prevent text wrapping
      const finalY = (doc as any).lastAutoTable.finalY || 40

      // Create a separate table for the total with better formatting
      autoTable(doc, {
        body: [
          [
            {
              content: filterBarber === "all" ? "TOPLAM:" : `${filterBarber} TOPLAM:`,
              colSpan: 3,
              styles: {
                fontStyle: "bold",
                halign: "right",
                fontSize: 12,
                cellWidth: "auto",
                minCellWidth: 120,
                cellPadding: 5,
                fillColor: [240, 240, 240],
              },
            },
            {
              content: `${total} TL`,
              styles: {
                fontStyle: "bold",
                halign: "right",
                fontSize: 12,
                cellPadding: 5,
                fillColor: [240, 240, 240],
              },
            },
          ],
        ],
        startY: finalY + 5,
        theme: "grid",
        tableWidth: "auto",
        margin: { left: 15, right: 15 },
        willDrawCell: (data) => {
          // Add a border to the total row
          const doc = data.doc
          const cell = data.cell

          doc.setDrawColor(153, 0, 0) // #990000
          doc.setLineWidth(0.3)

          // Draw a border around the cell
          doc.line(cell.x, cell.y, cell.x + cell.width, cell.y) // top
          doc.line(cell.x, cell.y + cell.height, cell.x + cell.width, cell.y + cell.height) // bottom
          doc.line(cell.x, cell.y, cell.x, cell.y + cell.height) // left
          doc.line(cell.x + cell.width, cell.y, cell.x + cell.width, cell.y + cell.height) // right
        },
      })

      // Add footer
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(10)
        doc.setTextColor(100, 100, 100)
        doc.text("© 2025 ODTU Berber - Eyyüpcan İşler", 105, doc.internal.pageSize.height - 10, { align: "center" })
      }

      // Save the PDF
      doc.save(`ODTU_Berber_Gelir_Raporu_${dateStr.replace(/\s/g, "_")}.pdf`)

      toast({
        title: "Başarılı",
        description: "PDF başarıyla indirildi.",
      })

      // Ask if user wants to clear records
      if (window.confirm("PDF indirildi. Kayıtları temizlemek istiyor musunuz?")) {
        setRecords([])
        localStorage.removeItem("barberShopRecords")

        toast({
          title: "Bilgi",
          description: "Tüm kayıtlar temizlendi.",
        })
      }
    } catch (error) {
      console.error("PDF oluşturma hatası:", error)
      toast({
        title: "Hata",
        description: "PDF oluşturulurken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }

  const calculateFilteredTotal = () => {
    return records
      .filter((record) => filterBarber === "all" || record.barber === filterBarber)
      .reduce((sum, record) => sum + Number.parseFloat(record.price), 0)
      .toFixed(2)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-[#990000] text-white p-4 sticky top-0 z-10 shadow-md">
        <div className="container mx-auto">
          <h1 className="text-xl md:text-2xl font-bold">ODTÜ Berber</h1>
        </div>
      </header>

      <main className="container mx-auto p-4 space-y-6 flex-grow">
        <Card className="shadow-lg">
          <CardHeader className="bg-[#990000]/10">
            <CardTitle className="text-lg md:text-xl">Hizmet Giriş Formu</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Berber Seçin</label>
                <Select value={selectedBarber} onValueChange={setSelectedBarber}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Berber seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Berber 1">Berber 1</SelectItem>
                    <SelectItem value="Berber 2">Berber 2</SelectItem>
                    <SelectItem value="Berber 3">Berber 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Hizmet Seçin</label>
                <Select value={selectedService} onValueChange={setSelectedService}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Hizmet seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Saç Kesimi">Saç Kesimi</SelectItem>
                    <SelectItem value="Tıraş">Tıraş</SelectItem>
                    <SelectItem value="Sakal Tıraşı">Sakal Tıraşı</SelectItem>
                    <SelectItem value="Saç Boyama">Saç Boyama</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Fiyat</label>
                <div className="space-y-2">
                  <Input
                    type="number"
                    placeholder="Fiyat girin"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full"
                  />
                  {selectedService && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {servicePrices[selectedService as keyof typeof servicePrices]?.map((defaultPrice) => (
                        <Button
                          key={defaultPrice}
                          type="button"
                          variant="outline"
                          size="sm"
                          className={`${price === defaultPrice ? "bg-[#990000] text-white" : "border-[#990000] text-[#990000]"}`}
                          onClick={() => setPrice(defaultPrice)}
                        >
                          {defaultPrice}₺
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-end">
                <Button className="bg-[#990000] hover:bg-[#7a0000] text-white w-full" onClick={handleSave}>
                  <Save className="mr-2 h-4 w-4" />
                  Kaydet
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="bg-[#990000]/10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <CardTitle className="text-lg md:text-xl">Günlük Kayıtlar</CardTitle>
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                <Select value={filterBarber} onValueChange={setFilterBarber}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Tüm Berberler" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm Berberler</SelectItem>
                    <SelectItem value="Berber 1">Berber 1</SelectItem>
                    <SelectItem value="Berber 2">Berber 2</SelectItem>
                    <SelectItem value="Berber 3">Berber 3</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  className="border-[#990000] text-[#990000] w-full sm:w-auto"
                  onClick={generatePDF}
                >
                  <Download className="mr-2 h-4 w-4" />
                  PDF İndir
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-100">
                <TableRow>
                  <TableHead>Berber</TableHead>
                  <TableHead>Saat</TableHead>
                  <TableHead>Hizmet</TableHead>
                  <TableHead className="text-right">Fiyat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                      Henüz kayıt yok. Yukarıdaki formu kullanarak hizmet ekleyin.
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {records
                      .filter((record) => filterBarber === "all" || record.barber === filterBarber)
                      .map((record, index) => (
                        <TableRow key={index}>
                          <TableCell>{record.barber}</TableCell>
                          <TableCell>{record.time}</TableCell>
                          <TableCell>{record.service}</TableCell>
                          <TableCell className="text-right">{record.price}₺</TableCell>
                        </TableRow>
                      ))}
                    <TableRow className="font-bold bg-gray-50">
                      <TableCell colSpan={3} className="text-right">
                        {filterBarber === "all" ? "Toplam Günlük Gelir:" : `${filterBarber} Toplam Gelir:`}
                      </TableCell>
                      <TableCell className="text-right">{calculateFilteredTotal()}₺</TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      <footer className="bg-[#990000] text-white p-4 mt-auto">
        <div className="container mx-auto text-center text-sm">© 2025 ODTÜ Berber - Eyyüpcan İşler</div>
      </footer>

      <Toaster />
    </div>
  )
}

